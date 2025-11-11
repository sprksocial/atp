import { Command } from "@cliffy/command";
import {
  applyFileDiff,
  genFileDiff,
  printFileDiff,
  readAllLexicons,
} from "../util.ts";
import { formatGeneratedFiles } from "../codegen/util.ts";
import { genServerApi } from "../codegen/server.ts";

const command = new Command()
  .description("Generate a TS server API")
  .option("--js", "use .js extension for imports instead of .ts")
  .option("-o, --outdir <outdir>", "dir path to write to", { required: true })
  .option("-i, --input <input...>", "paths of lexicon files to include", {
    required: true,
  })
  .action(
    async ({ outdir, input, js }) => {
      console.log("Generating API...");
      const lexicons = readAllLexicons(input);
      const api = await genServerApi(lexicons, {
        useJsExtension: js,
      });
      console.log("API generated.");
      const diff = genFileDiff(outdir, api);
      console.log("This will write the following files:");
      printFileDiff(diff);
      applyFileDiff(diff);
      if (typeof Deno !== "undefined") {
        await formatGeneratedFiles(outdir);
      }
      console.log("API generated.");
    },
  );

export default command;
