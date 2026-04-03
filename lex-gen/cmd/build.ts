import { Command } from "@cliffy/command";
import { build } from "../builder/mod.ts";

const command = new Command()
  .description(
    "Generate TypeScript lexicon schema files from JSON lexicon definitions",
  )
  .option(
    "-i, --lexicons <lexicons>",
    "directory containing lexicon JSON files",
    { default: "./lexicons" },
  )
  .option(
    "-o, --out <out>",
    "output directory for generated TS files",
    { required: true, default: "./lex" },
  )
  .option("--clear", "clear output directory before generating files", {
    default: false,
  })
  .option(
    "--override",
    "override existing files (no effect when --clear is set)",
    { default: false },
  )
  .option("--js", "use .js extension for imports and generated files", {
    default: false,
  })
  .option(
    "--import-ext <ext>",
    "file extension for import statements in generated files (overrides --js)",
  )
  .option(
    "--file-ext <ext>",
    "file extension for generated files (overrides --js)",
  )
  .option(
    "--lib <lib>",
    'package name to import the "l" schema utility from',
    { default: "@atp/lex" },
  )
  .option(
    "--allow-legacy-blobs",
    "generate schemas that accept legacy blob references",
    { default: false },
  )
  .option(
    "--pure-annotations",
    "add /*#__PURE__*/ annotations for tree-shaking tools",
    { default: false },
  )
  .option(
    "--ignore-invalid-lexicons",
    "skip invalid lexicon files instead of exiting with an error",
    { default: false },
  )
  .option(
    "--include <patterns...>",
    "NSID patterns to include (supports * wildcards)",
  )
  .option(
    "--exclude <patterns...>",
    "NSID patterns to exclude (supports * wildcards)",
  )
  .action(async (opts) => {
    const useJs = opts.js ?? false;
    const importExt = opts.importExt ?? (useJs ? ".js" : ".ts");
    const fileExt = opts.fileExt ?? (useJs ? ".js" : ".ts");

    await build({
      lexicons: opts.lexicons,
      out: opts.out,
      clear: opts.clear,
      override: opts.override,
      importExt,
      fileExt,
      lib: opts.lib,
      allowLegacyBlobs: opts.allowLegacyBlobs,
      pureAnnotations: opts.pureAnnotations,
      ignoreInvalidLexicons: opts.ignoreInvalidLexicons,
      include: opts.include,
      exclude: opts.exclude,
    });

    await denoFmt(opts.out);
    console.log("Done.");
  });

async function denoFmt(dir: string): Promise<void> {
  const cmd = new Deno.Command("deno", {
    args: ["fmt", dir],
    cwd: Deno.cwd(),
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await cmd.output();
  if (code !== 0) {
    console.warn(`Warning: deno fmt exited with code ${code}`);
  }
}

export default command;
