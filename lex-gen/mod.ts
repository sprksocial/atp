/**
 * # AT Protocol Lexicon Generator
 *
 * A command-line interface for generating TypeScript schema files from AT
 * Protocol lexicon JSON definitions using the `@atp/lex` schema system.
 *
 * ## Installation
 * ```bash
 * deno install -g jsr:@atp/lex-gen --name lex-gen
 * ```
 *
 * @example
 * ```bash
 * lex-gen build -i ./lexicons -o ./src/lexicons
 * ```
 *
 * @module
 */
import { Command } from "@cliffy/command";
import { build } from "./cmd/index.ts";
import process from "node:process";

export { build as buildCommand } from "./builder/mod.ts";
export type {
  LexBuilderLoadOptions,
  LexBuilderOptions,
  LexBuilderSaveOptions,
} from "./builder/mod.ts";

const isDeno = typeof Deno !== "undefined";

await new Command()
  .name("lex-gen")
  .description("Lexicon Generator")
  .command("build", build)
  .parse(isDeno ? Deno.args : process.argv.slice(2));
