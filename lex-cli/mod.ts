/**
 * # AT Protocol Lexicon CLI
 *
 * A command-line interface for generating docs, servers, and clients
 * from AT Protocol lexicon files.
 *
 * Turn lexicon files into:
 * - Markdown documentation
 * - Server implementation
 * - TypeScript objects
 * - Client implementation
 *
 * ## Installation
 * ```bash
 * deno install -g jsr:@atp/lex-cli@latest --name lex-cli
 * ```
 * Alternatively, you can use it without installation by referring to
 * it as `jsr:@atp/lex-cli` instead of `lex-cli`.
 *
 * @example Generate Server
 * ```bash
 * lex-cli gen-server -i <path/to/lexicon/dir> -o <output/path>
 * ```
 *
 * @example Generate Client
 * ```bash
 * lex-cli gen-api -i <path/to/lexicon/dir> -o <output/path>
 * ```
 *
 * @module
 */
import { Command } from "@cliffy/command";
import { genApi, genMd, genServer, genTsObj } from "./cmd/index.ts";
import process from "node:process";

const isDeno = typeof Deno !== "undefined";

await new Command()
  .name("lex-cli")
  .description("Lexicon CLI")
  .command("gen-api", genApi)
  .command("gen-md", genMd)
  .command("gen-server", genServer)
  .command("gen-ts-obj", genTsObj)
  .parse(isDeno ? Deno.args : process.argv.slice(2));
