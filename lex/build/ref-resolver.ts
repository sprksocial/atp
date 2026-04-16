import assert from "node:assert";
import { join } from "node:path";
import type { SourceFile } from "ts-morph";
import type { LexiconDocument, LexiconIndexer } from "../document/mod.ts";
import { isReservedWord, isSafeIdentifier } from "./ts-lang.ts";
import {
  asRelativePath,
  memoize,
  toCamelCase,
  toPascalCase,
  ucFirst,
} from "./util.ts";

export type RefResolverOptions = {
  importExt?: string;
};

export type ResolvedRef = {
  varName: string;
  typeName: string;
};

export class RefResolver {
  constructor(
    private doc: LexiconDocument,
    private file: SourceFile,
    private indexer: LexiconIndexer,
    private options: RefResolverOptions,
  ) {}

  public readonly resolve = memoize(
    (ref: string): Promise<ResolvedRef> | ResolvedRef => {
      const [nsid, hash = "main"] = ref.split("#");

      if (nsid === "" || nsid === this.doc.id) {
        return this.resolveLocal(hash);
      } else {
        const fullRef = `${nsid}#${hash}`;
        return this.resolveExternal(fullRef);
      }
    },
  );

  #defCounters = new Map<string, number>();
  private nextSafeDefinitionIdentifier(safeIdentifier: string): string {
    const count = this.#defCounters.get(safeIdentifier) ?? 0;
    this.#defCounters.set(safeIdentifier, count + 1);
    return `${safeIdentifier}$${count}`;
  }

  public readonly resolveLocal = memoize(
    (hash: string): ResolvedRef => {
      const hashes = Object.keys(this.doc.defs);

      if (!hashes.includes(hash)) {
        throw new Error(`Definition ${hash} not found in ${this.doc.id}`);
      }

      const pub = getPublicIdentifiers(hash);
      for (const otherHash of hashes) {
        if (otherHash === hash) continue;
        const otherPub = getPublicIdentifiers(otherHash);
        if (otherPub.typeName === pub.typeName) {
          throw new Error(
            `Conflicting type names for definitions #${hash} and #${otherHash} in ${this.doc.id}`,
          );
        }
      }

      const safeIdentifier = asSafeDefinitionIdentifier(hash);

      const varName = safeIdentifier
        ? !hashes.some((otherHash) => {
            if (otherHash === hash) return false;
            const otherIdentifier = asSafeDefinitionIdentifier(otherHash);
            return otherIdentifier === safeIdentifier;
          })
          ? safeIdentifier
          : this.nextSafeDefinitionIdentifier(safeIdentifier)
        : this.nextSafeDefinitionIdentifier("def");

      const typeName = ucFirst(varName);
      assert(
        varName !== typeName,
        "Variable and type name should be different",
      );

      return { varName, typeName };
    },
  );

  private readonly resolveExternal = memoize(
    async (fullRef: string): Promise<ResolvedRef> => {
      const [nsid, hash] = fullRef.split("#");
      const moduleSpecifier = `${
        asRelativePath(
          this.file.getDirectoryPath(),
          join("/", ...nsid.split(".")),
        )
      }.defs${this.options.importExt ?? ".ts"}`;

      const srcDoc = await this.indexer.get(nsid);
      const srcDefs = srcDoc.defs as unknown as Record<string, unknown>;
      const srcDef = Object.hasOwn(srcDoc.defs, hash) ? srcDefs[hash] : null;
      if (!srcDef) {
        throw new Error(
          `Missing def "${hash}" in "${nsid}" (referenced from ${this.doc.id})`,
        );
      }

      const nsIdentifier = this.getNsIdentifier(nsid, moduleSpecifier);
      const publicIds = getPublicIdentifiers(hash);

      return {
        varName: isSafeIdentifier(publicIds.varName)
          ? `${nsIdentifier}.${publicIds.varName}`
          : `${nsIdentifier}[${JSON.stringify(publicIds.varName)}]`,
        typeName: `${nsIdentifier}.${publicIds.typeName}`,
      };
    },
  );

  private getNsIdentifier(nsid: string, moduleSpecifier: string): string {
    const existing = this.file.getImportDeclaration(
      (imp) =>
        !imp.isTypeOnly() &&
        imp.getModuleSpecifierValue() === moduleSpecifier &&
        imp.getNamespaceImport() != null,
    );

    const decl = existing ??
      this.file.addImportDeclaration({
        moduleSpecifier,
        namespaceImport: this.computeSafeNamespaceIdentifierFor(nsid),
      });

    return decl.getNamespaceImport()!.getText();
  }

  #nsIdentifiersCounters = new Map<string, number>();
  private computeSafeNamespaceIdentifierFor(nsid: string): string {
    const baseName = nsidToIdentifier(nsid) || "NS";

    let name = baseName;
    while (this.isConflictingIdentifier(name)) {
      const count = this.#nsIdentifiersCounters.get(baseName) ?? 0;
      this.#nsIdentifiersCounters.set(baseName, count + 1);
      name = `${baseName}$$${count}`;
    }

    return name;
  }

  private isConflictingIdentifier(name: string): boolean {
    return (
      this.conflictsWithKeywords(name) ||
      this.conflictsWithUtils(name) ||
      this.conflictsWithLocalDefs(name) ||
      this.conflictsWithLocalDeclarations(name) ||
      this.conflictsWithImports(name)
    );
  }

  private conflictsWithKeywords(name: string): boolean {
    return isReservedWord(name);
  }

  private conflictsWithUtils(name: string): boolean {
    if (name === "Main") return true;
    if (name === "Record") return true;
    return name.startsWith("$");
  }

  private conflictsWithLocalDefs(name: string): boolean {
    return Object.keys(this.doc.defs).some((hash) => {
      const identifier = toCamelCase(hash);
      if (!identifier) return false;
      if (identifier === name || `_${identifier}` === name) return true;
      const typeName = ucFirst(identifier);
      if (typeName === name || `_${typeName}` === name) return true;
      return false;
    });
  }

  private conflictsWithLocalDeclarations(name: string): boolean {
    return (
      this.file.getVariableDeclarations().some((v) => v.getName() === name) ||
      this.file
        .getVariableStatements()
        .some((vs) => vs.getDeclarations().some((d) => d.getName() === name)) ||
      this.file.getTypeAliases().some((t) => t.getName() === name) ||
      this.file.getInterfaces().some((i) => i.getName() === name) ||
      this.file.getClasses().some((c) => c.getName() === name) ||
      this.file.getFunctions().some((f) => f.getName() === name) ||
      this.file.getEnums().some((e) => e.getName() === name)
    );
  }

  private conflictsWithImports(name: string): boolean {
    return this.file.getImportDeclarations().some(
      (imp) =>
        imp.getDefaultImport()?.getText() === name ||
        imp.getNamespaceImport()?.getText() === name ||
        imp.getNamedImports().some(
          (named) =>
            (named.getAliasNode()?.getText() ?? named.getName()) === name,
        ),
    );
  }
}

function nsidToIdentifier(nsid: string): string | undefined {
  const parts = nsid.split(".");
  for (let i = 2; i < parts.length; i++) {
    const identifier = toPascalCase(parts.slice(-i).join("."));
    if (isSafeIdentifier(identifier)) return identifier;
  }
  return undefined;
}

export function getPublicIdentifiers(hash: string): ResolvedRef {
  const varName = hash;
  const typeName = toPascalCase(hash);
  if (!typeName || varName === typeName || !isSafeIdentifier(typeName)) {
    return { varName, typeName: `Def${typeName}` };
  }
  return { varName, typeName };
}

function asSafeDefinitionIdentifier(name: string): string | undefined {
  if (isSafeIdentifier(name) && isSafeIdentifier(ucFirst(name))) return name;
  const camel = toCamelCase(name);
  if (isSafeIdentifier(camel) && isSafeIdentifier(ucFirst(camel))) return camel;
  return undefined;
}
