import { Command } from "@cliffy/command";
import { genTsObj, readAllLexicons, shouldPullLexicons } from "../util.ts";
import { loadLexiconConfig } from "../config.ts";
import { cleanupPullDirectory, pullLexicons } from "../pull.ts";
import process from "node:process";

const isDeno = typeof Deno !== "undefined";

const command = new Command()
  .description("Generate a TS file that exports an array of lexicons")
  .option("-i, --input <lexicons>", "paths of the lexicon files to include")
  .option("--config <config>", "path to config file")
  .action(async ({ input, config: configPath }) => {
    const config = await loadLexiconConfig(configPath);
    const finalInput = input ?? config?.files;

    if (!finalInput || finalInput.length === 0) {
      console.error(
        "input is required (provide via -i/--input or config.files)",
      );
      if (isDeno) {
        Deno.exit(1);
      } else {
        process.exit(1);
      }
    }

    const filesProvidedViaCli = input !== undefined;
    const finalInputArray = Array.isArray(finalInput)
      ? finalInput
      : [finalInput];
    const needsPull = shouldPullLexicons(
      config,
      filesProvidedViaCli,
      finalInputArray,
    );
    if (needsPull && config?.pull) {
      await pullLexicons(config.pull);
    }

    const lexicons = readAllLexicons(finalInput);
    console.log(genTsObj(lexicons));

    if (needsPull && config?.pull) {
      cleanupPullDirectory(config.pull);
    }
  });

export default command;
