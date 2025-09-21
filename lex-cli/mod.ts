#!/usr/bin/env node

import { Command } from "@cliffy/command";
import { genApi, genMd, genServer, genTsObj } from "./cmd/index.ts";

await new Command()
  .name("lex-cli")
  .description("Lexicon CLI")
  .command("gen-api", genApi)
  .command("gen-md", genMd)
  .command("gen-server", genServer)
  .command("gen-ts-obj", genTsObj)
  .parse(Deno.args);
