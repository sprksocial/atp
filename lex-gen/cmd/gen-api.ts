import { Command } from "@cliffy/command";
import {
  applyFileDiff,
  genFileDiff,
  printFileDiff,
  readAllLexicons,
} from "../util.ts";
import { genClientApi } from "../codegen/client.ts";
import { formatGeneratedFiles } from "../codegen/util.ts";
import { loadLexiconConfig } from "../config.ts";
import { cleanupPullDirectory, pullLexicons } from "../pull.ts";
import process from "node:process";

const command = new Command()
  .description("Generate a TS client API")
  .option("--js", "use .js extension for imports instead of .ts")
  .option("-o, --outdir <outdir>", "dir path to write to")
  .option("-i, --input <input...>", "paths of lexicon files to include")
  .option("--config <config>", "path to config file")
  .action(
    async ({ outdir, input, js, config: configPath }) => {
      const config = await loadLexiconConfig(configPath);
      const finalOutdir = outdir ?? config?.outdir;
      const finalInput = input ?? config?.files;

      if (!finalOutdir) {
        console.error("outdir is required (provide via -o/--outdir or config)");
        if (typeof Deno !== "undefined") {
          Deno.exit(1);
        } else {
          process.exit(1);
        }
      }

      if (!finalInput || finalInput.length === 0) {
        console.error(
          "input is required (provide via -i/--input or config.files)",
        );
        if (typeof Deno !== "undefined") {
          Deno.exit(1);
        } else {
          process.exit(1);
        }
      }

      if (config?.pull) {
        await pullLexicons(config.pull);
      }

      const useJs = js ?? false;
      const importSuffix = config?.modules?.importSuffix;
      const mappings = config?.mappings;
      const lexicons = readAllLexicons(finalInput);
      const api = await genClientApi(lexicons, {
        useJsExtension: useJs,
        importSuffix: importSuffix,
        mappings: mappings,
      });
      const diff = genFileDiff(finalOutdir, api);
      console.log("This will write the following files:");
      printFileDiff(diff);
      applyFileDiff(diff);
      if (typeof Deno !== "undefined") {
        await formatGeneratedFiles(finalOutdir);
      }
      console.log("API generated.");

      if (config?.pull) {
        cleanupPullDirectory(config.pull);
      }
    },
  );

export default command;
