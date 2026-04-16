import { Command } from "@cliffy/command";
import buildCommand from "./cli/build.ts";
import installCommand from "./cli/install.ts";

const command = new Command()
  .name("lex")
  .description("AT Protocol Lex tools")
  .command("build", buildCommand)
  .command("install", installCommand);

if (import.meta.main) {
  await command.parse(Deno.args);
}

export default command;
