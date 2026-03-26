export * from "./filter.ts";
export * from "./directory-indexer.ts";
export * from "./filtered-indexer.ts";
export * from "./lex-builder.ts";

export type {
  LexBuilderLoadOptions,
  LexBuilderOptions,
  LexBuilderSaveOptions,
} from "./lex-builder.ts";

export async function build(
  options:
    & import("./lex-builder.ts").LexBuilderOptions
    & import("./lex-builder.ts").LexBuilderLoadOptions
    & import("./lex-builder.ts").LexBuilderSaveOptions,
): Promise<void> {
  const { LexBuilder } = await import("./lex-builder.ts");
  const builder = new LexBuilder(options);
  await builder.load(options);
  await builder.save(options);
}
