import { Command } from "@cliffy/command";
import {
  applyFileDiff,
  genFileDiff,
  printFileDiff,
  readAllLexicons,
  shouldPullLexicons,
} from "../util.ts";
import { formatGeneratedFiles } from "../codegen/util.ts";
import { genServerApi } from "../codegen/server.ts";
import { loadLexiconConfig } from "../config.ts";
import { cleanupPullDirectory, pullLexicons } from "../pull.ts";
import process from "node:process";

const isDeno = typeof Deno !== "undefined";

const command = new Command()
  .description("Generate a TS server API")
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
        if (isDeno) {
          Deno.exit(1);
        } else {
          process.exit(1);
        }
      }

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
      const needsPull = shouldPullLexicons(
        config,
        filesProvidedViaCli,
        finalInput,
      );
      if (needsPull && config?.pull) {
        await pullLexicons(config.pull);
      }

      const useJs = js ?? false;
      const importSuffix = config?.modules?.importSuffix;
      const mappings = config?.mappings;
      console.log("Generating API...");
      const lexicons = readAllLexicons(finalInput);
      const api = await genServerApi(lexicons, {
        useJsExtension: useJs,
        importSuffix: importSuffix,
        mappings: mappings,
      });
      console.log("API generated.");
      const diff = genFileDiff(finalOutdir, api);
      console.log("This will write the following files:");
      printFileDiff(diff);
      applyFileDiff(diff);
      if (typeof Deno !== "undefined") {
        await formatGeneratedFiles(finalOutdir);
      }
      console.log("API generated.");

      if (needsPull && config?.pull) {
        cleanupPullDirectory(config.pull);
      }
    },
  );

export default command;
