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
 * lex-gen build -i ./lexicons -o ./lex
 * ```
 *
 * @module
 */
import { Command } from "@cliffy/command";
import { build, genApi, genMd, genServer, genTsObj } from "./cmd/index.ts";
import { defineLexiconConfig, loadLexiconConfig } from "./config.ts";
import process from "node:process";

export { defineLexiconConfig, loadLexiconConfig };
export { build as buildCommand } from "./builder/mod.ts";
export type {
  LexBuilderLoadOptions,
  LexBuilderOptions,
  LexBuilderSaveOptions,
} from "./builder/mod.ts";
export type {
  GitSourceConfig,
  ImportMapping,
  LexiconConfig,
  ModulesConfig,
  PullConfig,
  SourceConfig,
} from "./types.ts";

const isDeno = typeof Deno !== "undefined";

await new Command()
  .name("lex-gen")
  .description("Lexicon Generator")
  .command("api", genApi)
  .command("md", genMd)
  .command("server", genServer)
  .command("ts-obj", genTsObj)
  .command("build", build)
  .parse(isDeno ? Deno.args : process.argv.slice(2));
