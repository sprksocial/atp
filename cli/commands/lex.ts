import { Command } from "@cliffy/command";
import { genApi, genMd, genServer, genTsObj } from "./lex/index.ts";

export const lexCommand = new Command()
  .name("lex")
  .description("Lexicon-related commands");

lexCommand
  .command("gen-api", genApi)
  .command("gen-md", genMd)
  .command("gen-server", genServer)
  .command("gen-ts-obj", genTsObj);
