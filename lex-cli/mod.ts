#!/usr/bin/env node

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
