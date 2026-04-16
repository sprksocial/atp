import { CID } from "multiformats/cid";
import { assertEquals, assertRejects } from "@std/assert";
import { join } from "node:path";
import { AtUri, NSID } from "@atp/syntax";
import { cidForLex } from "../cbor/mod.ts";
import {
  install,
  type LexiconsManifest,
  LexInstaller,
  LexInstallerError,
  type LexInstallerResolver,
  normalizeLexiconsManifest,
} from "../installer/mod.ts";
import {
  type LexiconDocument,
  lexiconDocumentSchema,
} from "../document/mod.ts";
import type { LexValue } from "../data/lex.ts";

const COLLECTION = "com.atproto.lexicon.schema";

class StubResolver implements LexInstallerResolver {
  readonly resolved: string[] = [];
  readonly fetched: string[] = [];

  constructor(
    private readonly documents: Record<string, LexiconDocument>,
    private readonly authority = "did:plc:test",
  ) {}

  resolve(nsidStr: NSID | string): Promise<AtUri> {
    const nsid = NSID.from(nsidStr).toString();
    this.resolved.push(nsid);
    return Promise.resolve(AtUri.make(this.authority, COLLECTION, nsid));
  }

  async fetch(uriStr: AtUri | string) {
    const uri = typeof uriStr === "string" ? new AtUri(uriStr) : uriStr;
    const lexicon = this.documents[uri.rkey];
    if (!lexicon) {
      throw new Error(`Unknown lexicon ${uri.rkey}`);
    }
    this.fetched.push(uri.toString());
    const cid = CID.parse((await cidForDocument(lexicon)).toString());
    return { uri, cid, lexicon };
  }
}

function createLexicon(
  id: string,
  dependency?: string,
): LexiconDocument {
  return lexiconDocumentSchema.parse({
    lexicon: 1,
    id,
    defs: {
      main: dependency
        ? {
          type: "query",
          output: {
            encoding: "application/json",
            schema: {
              type: "ref" as const,
              ref: dependency,
            },
          },
        }
        : {
          type: "object" as const,
          properties: {
            ok: { type: "boolean" },
          },
        },
    },
  });
}

function cidForDocument(lexicon: LexiconDocument) {
  return cidForLex(lexicon as unknown as LexValue);
}

Deno.test("installer reuses local lexicons and fetches missing dependencies", async () => {
  const root = await Deno.makeTempDir({ prefix: "lex-installer-" });

  try {
    const lexicons = join(root, "lexicons");
    const manifestPath = join(root, "lexicons.json");
    const rootLexicon = createLexicon("com.example.root", "com.example.dep");
    const depLexicon = createLexicon("com.example.dep");
    const resolver = new StubResolver({
      [rootLexicon.id]: rootLexicon,
      [depLexicon.id]: depLexicon,
    });

    await Deno.mkdir(join(lexicons, "com", "example"), { recursive: true });
    await Deno.writeTextFile(
      join(lexicons, "com", "example", "root.json"),
      JSON.stringify(rootLexicon),
    );

    const installer = new LexInstaller({
      lexicons,
      manifest: manifestPath,
      resolver,
    });

    try {
      await installer.install({
        additions: [rootLexicon.id],
      });
      await installer.save();
    } finally {
      await installer[Symbol.asyncDispose]();
    }

    assertEquals(resolver.resolved, [rootLexicon.id, depLexicon.id]);
    assertEquals(resolver.fetched, [
      `at://did:plc:test/${COLLECTION}/${depLexicon.id}`,
    ]);

    const savedDep = JSON.parse(
      await Deno.readTextFile(
        join(lexicons, "com", "example", "dep.json"),
      ),
    );
    assertEquals(savedDep.id, depLexicon.id);

    const manifest = JSON.parse(
      await Deno.readTextFile(manifestPath),
    ) as LexiconsManifest;
    assertEquals(
      manifest,
      normalizeLexiconsManifest({
        version: 1,
        lexicons: [rootLexicon.id],
        resolutions: {
          [rootLexicon.id]: {
            uri: `at://did:plc:test/${COLLECTION}/${rootLexicon.id}`,
            cid: (await cidForDocument(rootLexicon)).toString(),
          },
          [depLexicon.id]: {
            uri: `at://did:plc:test/${COLLECTION}/${depLexicon.id}`,
            cid: (await cidForDocument(depLexicon)).toString(),
          },
        },
      }),
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("install supports explicit at:// additions without resolving", async () => {
  const root = await Deno.makeTempDir({ prefix: "lex-installer-uri-" });

  try {
    const lexicons = join(root, "lexicons");
    const manifestPath = join(root, "lexicons.json");
    const lexicon = createLexicon("com.example.uri");
    const resolver = new StubResolver({
      [lexicon.id]: lexicon,
    }, "did:plc:uri");

    await install({
      lexicons,
      manifest: manifestPath,
      resolver,
      add: [`at://did:plc:uri/${COLLECTION}/${lexicon.id}`],
      save: true,
    });

    assertEquals(resolver.resolved, []);
    assertEquals(resolver.fetched, [
      `at://did:plc:uri/${COLLECTION}/${lexicon.id}`,
    ]);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("install fails in ci mode when manifest is stale", async () => {
  const root = await Deno.makeTempDir({ prefix: "lex-installer-ci-" });

  try {
    const lexicons = join(root, "lexicons");
    const manifestPath = join(root, "lexicons.json");
    const lexicon = createLexicon("com.example.ci");
    const resolver = new StubResolver({
      [lexicon.id]: lexicon,
    });
    const staleManifest = {
      version: 1 as const,
      lexicons: [],
      resolutions: {},
    };

    await Deno.writeTextFile(
      manifestPath,
      JSON.stringify(staleManifest),
    );

    const error = await assertRejects(
      () =>
        install({
          lexicons,
          manifest: manifestPath,
          resolver,
          add: [lexicon.id],
          ci: true,
          save: false,
        }),
      LexInstallerError,
      "Lexicons manifest is out of date",
    );

    assertEquals(error.name, "LexInstallerError");
    await assertRejects(
      () => Deno.readTextFile(join(lexicons, "com", "example", "ci.json")),
      Deno.errors.NotFound,
    );
    assertEquals(
      JSON.parse(await Deno.readTextFile(manifestPath)),
      staleManifest,
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("install rejects explicit at:// additions outside the lexicon collection", async () => {
  const root = await Deno.makeTempDir({ prefix: "lex-installer-invalid-uri-" });

  try {
    const lexicons = join(root, "lexicons");
    const manifestPath = join(root, "lexicons.json");
    const lexicon = createLexicon("com.example.root");
    const resolver = new StubResolver({
      [lexicon.id]: lexicon,
    }, "did:plc:uri");

    await Deno.mkdir(join(lexicons, "com", "example"), { recursive: true });
    await Deno.writeTextFile(
      join(lexicons, "com", "example", "root.json"),
      JSON.stringify(lexicon),
    );

    const error = await assertRejects(
      () =>
        install({
          lexicons,
          manifest: manifestPath,
          resolver,
          add: [`at://did:plc:uri/app.bsky.feed.post/${lexicon.id}`],
          save: true,
        }),
      LexInstallerError,
      "Invalid lexicon URI collection",
    );

    assertEquals(error.name, "LexInstallerError");
    assertEquals(resolver.resolved, []);
    assertEquals(resolver.fetched, []);
    await assertRejects(() => Deno.stat(manifestPath), Deno.errors.NotFound);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("install rejects explicit at:// additions with handle authorities", async () => {
  const root = await Deno.makeTempDir({
    prefix: "lex-installer-handle-uri-",
  });

  try {
    const lexicons = join(root, "lexicons");
    const manifestPath = join(root, "lexicons.json");
    const lexicon = createLexicon("com.example.root");
    const resolver = new StubResolver({
      [lexicon.id]: lexicon,
    }, "did:plc:uri");

    await Deno.mkdir(join(lexicons, "com", "example"), { recursive: true });
    await Deno.writeTextFile(
      join(lexicons, "com", "example", "root.json"),
      JSON.stringify(lexicon),
    );

    const error = await assertRejects(
      () =>
        install({
          lexicons,
          manifest: manifestPath,
          resolver,
          add: [`at://example.com/${COLLECTION}/${lexicon.id}`],
          save: true,
        }),
      LexInstallerError,
      "Invalid lexicon URI authority",
    );

    assertEquals(error.name, "LexInstallerError");
    assertEquals(resolver.resolved, []);
    assertEquals(resolver.fetched, []);
    await assertRejects(() => Deno.stat(manifestPath), Deno.errors.NotFound);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
