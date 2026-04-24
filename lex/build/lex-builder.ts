import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { IndentationText, Project } from "ts-morph";
import type { LexiconDocument, LexiconIndexer } from "../document/mod.ts";
import { buildFilter, type BuildFilterOptions } from "./filter.ts";
import { FilteredIndexer } from "./filtered-indexer.ts";
import { LexDefBuilder, type LexDefBuilderOptions } from "./def-builder.ts";
import { formatGeneratedText } from "./formatter.ts";
import {
  LexiconDirectoryIndexer,
  type LexiconDirectoryIndexerOptions,
} from "./directory-indexer.ts";
import { isSafeIdentifier } from "./ts-lang.ts";

export type LexBuilderOptions = LexDefBuilderOptions & {
  importExt?: string;
  fileExt?: string;
};

export type LexBuilderLoadOptions =
  & LexiconDirectoryIndexerOptions
  & BuildFilterOptions;

export type LexBuilderSaveOptions = {
  out: string;
  clear?: boolean;
  override?: boolean;
  format?: boolean;
};

export class LexBuilder {
  readonly #imported = new Set<string>();
  readonly #project = new Project({
    useInMemoryFileSystem: true,
    manipulationSettings: { indentationText: IndentationText.TwoSpaces },
  });

  constructor(private readonly options: LexBuilderOptions = {}) {}

  get fileExt(): string {
    return this.options.fileExt ?? ".ts";
  }

  get importExt(): string {
    return this.options.importExt ?? ".ts";
  }

  async load(options: LexBuilderLoadOptions): Promise<void> {
    await using indexer = new FilteredIndexer(
      new LexiconDirectoryIndexer(options),
      buildFilter(options),
    );

    for await (const doc of indexer) {
      if (!this.#imported.has(doc.id)) {
        this.#imported.add(doc.id);
      } else {
        throw new Error(`Duplicate lexicon document id: ${doc.id}`);
      }

      await this.createDefsFile(doc, indexer);
      await this.createExportTree(doc);
    }
  }

  async save(options: LexBuilderSaveOptions): Promise<void> {
    const files = this.#project.getSourceFiles();
    const destination = resolve(options.out);

    if (options.clear) {
      await rm(destination, { recursive: true, force: true });
    } else if (!options.override) {
      await Promise.all(
        files.map((f) =>
          assertNotFileExists(
            resolveOutputFilePath(destination, f.getFilePath()),
          )
        ),
      );
    }

    await Promise.all(
      Array.from(files, async (file) => {
        const filePath = resolveOutputFilePath(destination, file.getFilePath());
        const content = options.format === false
          ? file.getFullText()
          : await formatGeneratedText(filePath, file.getFullText());
        await mkdir(dirname(filePath), { recursive: true });
        await rm(filePath, { recursive: true, force: true });
        await writeFile(filePath, content, "utf8");
      }),
    );
  }

  private createFile(path: string) {
    return this.#project.createSourceFile(path);
  }

  private getFile(path: string) {
    return this.#project.getSourceFile(path) ?? this.createFile(path);
  }

  private createExportTree(doc: LexiconDocument): void {
    const namespaces = doc.id.split(".");

    for (let i = 0; i < namespaces.length - 1; i++) {
      const currentNs = namespaces[i];
      const childNs = namespaces[i + 1];

      const path = join("/", ...namespaces.slice(0, i + 1));
      const file = this.getFile(`${path}${this.fileExt}`);

      const childModuleSpecifier = `./${currentNs}/${childNs}${this.importExt}`;
      const dec = file.getExportDeclaration(childModuleSpecifier);
      if (!dec) {
        file.addExportDeclaration({
          moduleSpecifier: childModuleSpecifier,
          namespaceExport: isSafeIdentifier(childNs)
            ? childNs
            : JSON.stringify(childNs),
        });
      }
    }

    const path = join("/", ...namespaces);
    const file = this.getFile(`${path}${this.fileExt}`);

    file.addExportDeclaration({
      moduleSpecifier: `./${namespaces.at(-1)}.defs${this.importExt}`,
    });

    file.addExportDeclaration({
      moduleSpecifier: `./${namespaces.at(-1)}.defs${this.importExt}`,
      namespaceExport: "$defs",
    });
  }

  private async createDefsFile(
    doc: LexiconDocument,
    indexer: LexiconIndexer,
  ): Promise<void> {
    const path = join("/", ...doc.id.split("."));
    const file = this.createFile(`${path}.defs${this.fileExt}`);

    const fileBuilder = new LexDefBuilder(
      { ...this.options, importExt: this.importExt },
      file,
      doc,
      indexer,
    );
    await fileBuilder.build();
  }
}

async function assertNotFileExists(file: string): Promise<void> {
  try {
    await stat(file);
    throw new Error(`File already exists: ${file}`);
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") return;
    throw err;
  }
}

function resolveOutputFilePath(destination: string, filePath: string): string {
  const relativePath = filePath
    .replaceAll("\\", "/")
    .replace(/^(?:[A-Za-z]:)?\/+/, "");
  return join(destination, ...relativePath.split("/").filter(Boolean));
}
