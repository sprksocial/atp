import { Command } from "@cliffy/command";
import { readAllLexicons } from "../util.ts";
import * as mdGen from "../mdgen/index.ts";

const command = new Command()
  .description("Generate markdown documentation")
  .option("-o, --output <outfile>", "Output file path", { required: true })
  .option("-i, --input <infile>", "Input file path", { required: true })
  .action(
    async ({ output, input }) => {
      if (!output.endsWith(".md")) {
        console.error(
          "Must supply the path to a .md file as the first parameter",
        );
        Deno.exit(1);
      }
      const lexicons = readAllLexicons(input);
      await mdGen.process(output, lexicons);
    },
  );

export default command;
