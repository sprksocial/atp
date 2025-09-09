import type { LexiconDoc } from "@atproto/lexicon";
import { XrpcClient } from "@atproto/xrpc";
import * as xrpcServer from "../mod.ts";
import { closeServer, createServer } from "./_util.ts";
import { assertEquals, assertRejects } from "@std/assert";

const LEXICONS: LexiconDoc[] = [
  {
    lexicon: 1,
    id: "io.example.paramTest",
    defs: {
      main: {
        type: "query",
        parameters: {
          type: "params",
          required: ["str", "int", "bool", "arr"],
          properties: {
            str: { type: "string", minLength: 2, maxLength: 10 },
            int: { type: "integer", minimum: 2, maximum: 10 },
            bool: { type: "boolean" },
            arr: { type: "array", items: { type: "integer" }, maxLength: 2 },
            def: { type: "integer", default: 0 },
          },
        },
        output: {
          encoding: "application/json",
        },
      },
    },
  },
];

Deno.test({
  name: "Parameters",
  async fn() {
    // Setup
    const server = xrpcServer.createServer(LEXICONS);
    server.method(
      "io.example.paramTest",
      (ctx: { params: xrpcServer.Params }) => ({
        encoding: "json",
        body: ctx.params,
      }),
    );

    const s = await createServer(server);
    const port = (s as Deno.HttpServer & { port: number }).port;
    const client = new XrpcClient(`http://localhost:${port}`, LEXICONS);

    try {
      Deno.test("validates query params", async () => {
        const res1 = await client.call("io.example.paramTest", {
          str: "valid",
          int: 5,
          bool: true,
          arr: [1, 2],
          def: 5,
        });
        assertEquals(res1.success, true);
        assertEquals(res1.data.str, "valid");
        assertEquals(res1.data.int, 5);
        assertEquals(res1.data.bool, true);
        assertEquals(res1.data.arr, [1, 2]);
        assertEquals(res1.data.def, 5);

        const res2 = await client.call("io.example.paramTest", {
          str: 10,
          int: "5",
          bool: "foo",
          arr: "3",
        });
        assertEquals(res2.success, true);
        assertEquals(res2.data.str, "10");
        assertEquals(res2.data.int, 5);
        assertEquals(res2.data.bool, true);
        assertEquals(res2.data.arr, [3]);
        assertEquals(res2.data.def, 0);

        // Test validation errors
        await assertRejects(
          () =>
            client.call("io.example.paramTest", {
              str: "n",
              int: 5,
              bool: true,
              arr: [1],
            }),
          Error,
          "str must not be shorter than 2 characters",
        );

        await assertRejects(
          () =>
            client.call("io.example.paramTest", {
              str: "loooooooooooooong",
              int: 5,
              bool: true,
              arr: [1],
            }),
          Error,
          "str must not be longer than 10 characters",
        );

        await assertRejects(
          () =>
            client.call("io.example.paramTest", {
              int: 5,
              bool: true,
              arr: [1],
            }),
          Error,
          'Params must have the property "str"',
        );

        await assertRejects(
          () =>
            client.call("io.example.paramTest", {
              str: "valid",
              int: -1,
              bool: true,
              arr: [1],
            }),
          Error,
          "int can not be less than 2",
        );

        await assertRejects(
          () =>
            client.call("io.example.paramTest", {
              str: "valid",
              int: 11,
              bool: true,
              arr: [1],
            }),
          Error,
          "int can not be greater than 10",
        );

        await assertRejects(
          () =>
            client.call("io.example.paramTest", {
              str: "valid",
              bool: true,
              arr: [1],
            }),
          Error,
          'Params must have the property "int"',
        );

        await assertRejects(
          () =>
            client.call("io.example.paramTest", {
              str: "valid",
              int: 5,
              arr: [1],
            }),
          Error,
          'Params must have the property "bool"',
        );

        await assertRejects(
          () =>
            client.call("io.example.paramTest", {
              str: "valid",
              int: 5,
              bool: true,
              arr: [],
            }),
          Error,
          'Error: Params must have the property "arr"',
        );

        await assertRejects(
          () =>
            client.call("io.example.paramTest", {
              str: "valid",
              int: 5,
              bool: true,
              arr: [1, 2, 3],
            }),
          Error,
          "Error: arr must not have more than 2 elements",
        );
      });
    } finally {
      // Cleanup
      await closeServer(s);
    }
  },
});
