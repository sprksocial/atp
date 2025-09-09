import { Command } from "@cliffy/command";
import {
  applyFileDiff,
  genFileDiff,
  printFileDiff,
  readAllLexicons,
} from "../util.ts";
import { genClientApi } from "../codegen/client.ts";
import { formatGeneratedFiles } from "../codegen/util.ts";

const command = new Command()
  .command("gen-api")
  .description("Generate a TS client API")
  .option("--js", "use .js extension for imports instead of .ts")
  .option("-o, --outdir <outdir>", "dir path to write to", { required: true })
  .option("-i, --input <input...>", "paths of lexicon files to include", {
    required: true,
  })
  .action(
    async ({ outdir, input, js }) => {
      const lexicons = readAllLexicons(input);
      const api = await genClientApi(lexicons, {
        useJsExtension: js,
      });
      const diff = genFileDiff(outdir, api);
      console.log("This will write the following files:");
      printFileDiff(diff);
      applyFileDiff(diff);
      await formatGeneratedFiles(outdir);
      console.log("API generated.");
    },
  );

export default command;
