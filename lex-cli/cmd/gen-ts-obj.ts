import { Command } from "@cliffy/command";
import { genTsObj, readAllLexicons } from "../util.ts";

const command = new Command()
  .description("Generate a TS file that exports an array of lexicons")
  .option("-i, --input <lexicons>", "paths of the lexicon files to include", {
    required: true,
  })
  .action(({ input }) => {
    const lexicons = readAllLexicons(input);
    console.log(genTsObj(lexicons));
  });

export default command;
