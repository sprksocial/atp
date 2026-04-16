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
 * lex-gen api -i ./lexicons -o ./api
 * ```
 *
 * @module
 */
import { Command } from "@cliffy/command";
import { defineLexiconConfig, loadLexiconConfig } from "./config.ts";
import process from "node:process";

export { defineLexiconConfig, loadLexiconConfig };
export { build } from "./builder/mod.ts";
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
const args = isDeno ? Deno.args : process.argv.slice(2);

const [
  { default: genApi },
  { default: genMd },
  { default: genServer },
  { default: genTsObj },
] = await Promise.all([
  import("./cmd/gen-api.ts"),
  import("./cmd/gen-md.ts"),
  import("./cmd/gen-server.ts"),
  import("./cmd/gen-ts-obj.ts"),
]);

await new Command()
  .name("lex-gen")
  .description("Lexicon Generator")
  .command("api", genApi)
  .command("md", genMd)
  .command("server", genServer)
  .command("ts-obj", genTsObj)
  .parse(args);
