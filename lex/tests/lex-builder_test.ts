import { assertRejects, assertStringIncludes } from "@std/assert";
import { join } from "node:path";
import { LexBuilder } from "../build/lex-builder.ts";

Deno.test({
  name: "save writes files under output directory and rejects existing files",
  async fn() {
    const root = await Deno.makeTempDir({ prefix: "lex-builder-" });

    try {
      const lexicons = join(root, "lexicons");
      const out = join(root, "out");

      await Deno.mkdir(lexicons, { recursive: true });
      await Deno.writeTextFile(
        join(lexicons, "com.example.echo.json"),
        JSON.stringify({
          lexicon: 1,
          id: "com.example.echo",
          defs: {
            main: {
              type: "query",
              output: {
                encoding: "application/json",
                schema: {
                  type: "object",
                  properties: {},
                },
              },
            },
          },
        }),
      );

      const builder = new LexBuilder();
      await builder.load({ lexicons });
      await builder.save({ out });

      const defsPath = join(out, "com", "example", "echo.defs.ts");
      const exportPath = join(out, "com", "example", "echo.ts");

      assertStringIncludes(
        await Deno.readTextFile(defsPath),
        'const $nsid = "com.example.echo";',
      );
      assertStringIncludes(
        await Deno.readTextFile(exportPath),
        "./echo.defs.ts",
      );

      await assertRejects(
        async () => await builder.save({ out }),
        Error,
        "File already exists:",
      );
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  },
});

Deno.test({
  name: "save can write files without formatting generated text",
  async fn() {
    const root = await Deno.makeTempDir({ prefix: "lex-builder-" });

    try {
      const lexicons = join(root, "lexicons");
      const out = join(root, "out");

      await Deno.mkdir(lexicons, { recursive: true });
      await Deno.writeTextFile(
        join(lexicons, "com.example.echo.json"),
        JSON.stringify({
          lexicon: 1,
          id: "com.example.echo",
          defs: {
            main: {
              type: "query",
              output: {
                encoding: "application/json",
                schema: {
                  type: "object",
                  properties: {},
                },
              },
            },
          },
        }),
      );

      const builder = new LexBuilder();
      await builder.load({ lexicons });
      await builder.save({ out, format: false });

      assertStringIncludes(
        await Deno.readTextFile(join(out, "com", "example", "echo.defs.ts")),
        'const $nsid = "com.example.echo";',
      );
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  },
});
