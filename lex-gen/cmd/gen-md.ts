import { Command } from "@cliffy/command";
import { readAllLexicons } from "../util.ts";
import * as mdGen from "../mdgen/index.ts";
import { loadLexiconConfig } from "../config.ts";
import { cleanupPullDirectory, pullLexicons } from "../pull.ts";
import process from "node:process";

const isDeno = typeof Deno !== "undefined";

const command = new Command()
  .description("Generate markdown documentation")
  .option("-o, --output <outfile>", "Output file path")
  .option("-i, --input <infile>", "Input file path")
  .option("--config <config>", "path to config file")
  .action(
    async ({ output, input, config: configPath }) => {
      const config = await loadLexiconConfig(configPath);
      const finalOutput = output ??
        (config?.outdir ? `${config.outdir}/docs.md` : undefined);
      const finalInput = input ?? config?.files?.[0];

      if (!finalOutput) {
        console.error("output is required (provide via -o/--output or config)");
        if (isDeno) {
          Deno.exit(1);
        } else {
          process.exit(1);
        }
      }

      if (!finalInput) {
        console.error(
          "input is required (provide via -i/--input or config.files)",
        );
        if (isDeno) {
          Deno.exit(1);
        } else {
          process.exit(1);
        }
      }

      if (!finalOutput.endsWith(".md")) {
        console.error(
          "Must supply the path to a .md file",
        );
        if (isDeno) {
          Deno.exit(1);
        } else {
          process.exit(1);
        }
      }

      if (config?.pull) {
        await pullLexicons(config.pull);
      }

      const lexicons = readAllLexicons(finalInput);
      await mdGen.process(finalOutput, lexicons);

      if (config?.pull) {
        cleanupPullDirectory(config.pull);
      }
    },
  );

export default command;
