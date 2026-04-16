import { join } from "node:path";
import { type Cid, cidForLex } from "../cbor/mod.ts";
import { parseCid } from "../data/cid.ts";
import type { LexValue } from "../data/lex.ts";
import type {
  LexiconDocument,
  LexiconParameters,
  LexiconPermission,
  LexiconRef,
  LexiconRefUnion,
  LexiconUnknown,
  MainLexiconDefinition,
  NamedLexiconDefinition,
} from "../document/mod.ts";
import { LexiconDirectoryIndexer } from "../build/mod.ts";
import {
  LexResolver,
  type LexResolverFetchOptions,
  type LexResolverOptions,
  type LexResolverResult,
} from "../resolver/mod.ts";
import { AtUri, ensureValidDid, NSID } from "@atp/syntax";
import { isEnoentError, writeJsonFile } from "./fs.ts";
import { LexInstallerError } from "./lex-installer-error.ts";
import {
  type LexiconsManifest,
  normalizeLexiconsManifest,
} from "./lexicons-manifest.ts";
import { NsidMap } from "./nsid-map.ts";
import { NsidSet } from "./nsid-set.ts";

const LEXICON_COLLECTION = "com.atproto.lexicon.schema";

export interface LexInstallerResolver {
  resolve(nsidStr: NSID | string): Promise<AtUri>;
  fetch(
    uriStr: AtUri | string,
    options?: LexResolverFetchOptions,
  ): Promise<LexResolverResult>;
}

export interface LexInstallerOptions extends LexResolverOptions {
  lexicons: string;
  manifest: string;
  update?: boolean;
  resolver?: LexInstallerResolver;
}

export interface LexInstallerFetchResult {
  lexicon: LexiconDocument;
  cid: Cid;
}

export class LexInstaller implements AsyncDisposable {
  protected readonly lexiconResolver: LexInstallerResolver;
  protected readonly indexer: LexiconDirectoryIndexer;
  protected readonly documents: NsidMap<LexiconDocument> = new NsidMap<
    LexiconDocument
  >();
  protected readonly manifest: LexiconsManifest = {
    version: 1,
    lexicons: [],
    resolutions: {},
  };

  constructor(protected readonly options: LexInstallerOptions) {
    this.lexiconResolver = options.resolver ?? new LexResolver(options);
    this.indexer = new LexiconDirectoryIndexer({
      lexicons: options.lexicons,
    });
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.indexer[Symbol.asyncDispose]();
  }

  equals(manifest: LexiconsManifest): boolean {
    return JSON.stringify(normalizeLexiconsManifest(manifest)) ===
      JSON.stringify(normalizeLexiconsManifest(this.manifest));
  }

  async install(
    {
      additions,
      manifest,
      write = true,
    }: {
      additions?: Iterable<string>;
      manifest?: LexiconsManifest;
      write?: boolean;
    } = {},
  ): Promise<void> {
    const roots = new NsidMap<AtUri | null>();

    for (const addition of new Set(additions ?? [])) {
      const [nsid, uri] = addition.startsWith("at://")
        ? ((parsedUri) => [NSID.from(parsedUri.rkey), parsedUri] as const)(
          new AtUri(addition),
        )
        : [NSID.from(addition), null] as const;

      if (roots.has(nsid)) {
        throw new LexInstallerError(
          `Duplicate lexicon addition: ${nsid} (${
            roots.get(nsid) ?? addition
          })`,
        );
      }

      roots.set(nsid, uri);
    }

    if (manifest) {
      for (const lexiconId of manifest.lexicons) {
        const nsid = NSID.from(lexiconId);
        if (roots.has(nsid)) continue;

        const resolution = manifest.resolutions[lexiconId];
        roots.set(nsid, resolution ? new AtUri(resolution.uri) : null);
      }
    }

    await Promise.all(
      Array.from(roots, async ([nsid, uri]) => {
        const { lexicon } = uri
          ? await this.installFromUri(uri, { write })
          : await this.installFromNsid(nsid, { write });
        this.manifest.lexicons.push(lexicon.id);
      }),
    );

    let installedCount = 0;
    do {
      const missing = Array.from(this.getMissingIds());
      installedCount = missing.length;

      await Promise.all(
        missing.map(async (nsid) => {
          const resolution = manifest?.resolutions[nsid.toString()];
          if (resolution?.uri) {
            await this.installFromUri(new AtUri(resolution.uri), { write });
          } else {
            await this.installFromNsid(nsid, { write });
          }
        }),
      );
    } while (installedCount > 0);
  }

  async save(): Promise<void> {
    await writeJsonFile(
      this.options.manifest,
      normalizeLexiconsManifest(this.manifest),
    );
  }

  async fetch(
    uri: AtUri,
    { write = true }: { write?: boolean } = {},
  ): Promise<LexInstallerFetchResult> {
    const { lexicon, cid } = await this.lexiconResolver.fetch(uri, {
      noCache: this.options.update,
    });
    const normalizedCid = parseCid(cid.toString());
    if (write) {
      const filePath = join(this.options.lexicons, ...lexicon.id.split(".")) +
        ".json";
      await writeJsonFile(filePath, lexicon);
    }
    return { lexicon, cid: normalizedCid };
  }

  protected getMissingIds(): NsidSet {
    const missing = new NsidSet();

    for (const document of this.documents.values()) {
      for (const nsid of listDocumentNsidRefs(document)) {
        if (!this.documents.has(nsid)) {
          missing.add(nsid);
        }
      }
    }

    return missing;
  }

  protected async installFromNsid(
    nsid: NSID,
    options?: { write?: boolean },
  ): Promise<{ lexicon: LexiconDocument; uri: AtUri }> {
    const uri = await this.lexiconResolver.resolve(nsid);
    return this.installFromUri(uri, options);
  }

  protected async installFromUri(
    uri: AtUri,
    { write = true }: { write?: boolean } = {},
  ): Promise<{ lexicon: LexiconDocument; uri: AtUri }> {
    assertLexiconUri(uri);

    const { lexicon, cid } = this.options.update
      ? await this.fetch(uri, { write })
      : await this.indexer.get(uri.rkey).then(
        async (existingLexicon) => ({
          lexicon: existingLexicon,
          cid: await cidForLexicon(existingLexicon),
        }),
        async (cause) => {
          if (isEnoentError(cause)) return await this.fetch(uri, { write });
          throw cause;
        },
      );

    this.documents.set(NSID.from(lexicon.id), lexicon);
    this.manifest.resolutions[lexicon.id] = {
      cid: cid.toString(),
      uri: uri.toString(),
    };

    return { lexicon, uri };
  }
}

function assertLexiconUri(uri: AtUri): void {
  if (uri.collection !== LEXICON_COLLECTION) {
    throw new LexInstallerError(
      `Invalid lexicon URI collection for ${uri}: expected ${LEXICON_COLLECTION}`,
    );
  }

  try {
    ensureValidDid(uri.host);
  } catch (cause) {
    throw new LexInstallerError(
      `Invalid lexicon URI authority for ${uri}: expected DID authority`,
      { cause },
    );
  }
}

function cidForLexicon(lexicon: LexiconDocument): Promise<Cid> {
  return cidForLex(lexicon as unknown as LexValue);
}

function* listDocumentNsidRefs(doc: LexiconDocument): Iterable<NSID> {
  try {
    for (const def of Object.values(doc.defs)) {
      if (!def) continue;
      for (const ref of defRefs(def)) {
        const [nsid] = ref.split("#", 1);
        if (nsid) {
          yield NSID.from(nsid);
        }
      }
    }
  } catch (cause) {
    throw new LexInstallerError(
      `Failed to extract refs from lexicon ${doc.id}`,
      { cause },
    );
  }
}

function* defRefs(
  def:
    | MainLexiconDefinition
    | NamedLexiconDefinition
    | LexiconPermission
    | LexiconParameters
    | LexiconRef
    | LexiconRefUnion
    | LexiconUnknown,
): Iterable<string> {
  switch (def.type) {
    case "string":
      for (const value of def.knownValues ?? []) {
        const [nsid, hash, extra] = value.split("#");
        if (!nsid || !hash || extra) continue;
        try {
          NSID.from(nsid);
          yield value;
        } catch {
          continue;
        }
      }
      return;
    case "array":
      yield* defRefs(def.items);
      return;
    case "params":
    case "object":
      for (const property of Object.values(def.properties)) {
        yield* defRefs(property);
      }
      return;
    case "union":
      yield* def.refs;
      return;
    case "ref":
      yield def.ref;
      return;
    case "record":
      yield* defRefs(def.record);
      return;
    case "procedure":
      if (def.input?.schema) {
        yield* defRefs(def.input.schema);
      }
      if (def.output?.schema) {
        yield* defRefs(def.output.schema);
      }
      if (def.parameters) {
        yield* defRefs(def.parameters);
      }
      return;
    case "query":
      if (def.output?.schema) {
        yield* defRefs(def.output.schema);
      }
      if (def.parameters) {
        yield* defRefs(def.parameters);
      }
      return;
    case "subscription":
      if (def.parameters) {
        yield* defRefs(def.parameters);
      }
      if (def.message?.schema) {
        yield* defRefs(def.message.schema);
      }
      return;
    case "permission-set":
      for (const permission of def.permissions) {
        yield* defRefs(permission);
      }
      return;
    case "permission":
      if (def.resource === "rpc" && Array.isArray(def.lxm)) {
        for (const lxm of def.lxm) {
          if (typeof lxm === "string") {
            yield lxm;
          }
        }
      }
      if (def.resource === "repo" && Array.isArray(def.collection)) {
        for (const collection of def.collection) {
          if (typeof collection === "string") {
            yield collection;
          }
        }
      }
      return;
    case "boolean":
    case "blob":
    case "bytes":
    case "cid-link":
    case "integer":
    case "token":
    case "unknown":
      return;
    default: {
      throw new LexInstallerError(
        `Unknown lexicon def type: ${
          (def as { type?: string }).type ?? "unknown"
        }`,
      );
    }
  }
}
