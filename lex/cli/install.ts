import { Command } from "@cliffy/command";

const command = new Command()
  .description("Fetch and install lexicon documents")
  .arguments("[additions...:string]")
  .option(
    "-i, --lexicons <lexicons>",
    "directory containing lexicon JSON files",
    { default: "./lexicons" },
  )
  .option(
    "-m, --manifest <manifest>",
    "path to lexicons manifest file",
    { default: "./lexicons.json" },
  )
  .option(
    "--save [save:boolean]",
    "write the updated lexicons manifest to disk",
    { default: true },
  )
  .option(
    "--update",
    "re-resolve and re-install existing lexicons instead of reusing local files",
    { default: false },
  )
  .option(
    "--ci",
    "error if the current install would change the manifest",
    { default: false },
  )
  .action(async (opts, ...additions: string[]) => {
    const { install } = await import("../installer/mod.ts");
    await install({
      add: additions,
      lexicons: opts.lexicons,
      manifest: opts.manifest,
      save: opts.save,
      update: opts.update,
      ci: opts.ci,
    });
  });

export default command;
