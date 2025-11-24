/**
 * # AT Protocol Lexicon Generator
 *
 * A command-line interface for generating docs, servers, and clients
 * from AT Protocol lexicon files.
 *
 * Previously named `lex-cli`
 *
 * Turn lexicon files into:
 * - Markdown documentation
 * - Server implementation
 * - TypeScript objects
 * - Client implementation
 *
 * ## Installation
 * ```bash
 * deno install -g jsr:@atp/lex-gen --name lex-gen
 * ```
 * Alternatively, you can use it without installation by referring to
 * it as `jsr:@atp/lex-gen` instead of `lex-gen`.
 *
 * @example Generate Server
 * ```bash
 * lex-gen server -i <path/to/lexicon/dir> -o <output/path>
 * ```
 *
 * @example Generate Client
 * ```bash
 * lex-gen api -i <path/to/lexicon/dir> -o <output/path>
 * ```
 *
 * @module
 */
import { Command } from "@cliffy/command";
import { genApi, genMd, genServer, genTsObj } from "./cmd/index.ts";
import { defineLexiconConfig, loadLexiconConfig } from "./config.ts";
import process from "node:process";

export { defineLexiconConfig, loadLexiconConfig };
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
  .parse(isDeno ? Deno.args : process.argv.slice(2));
