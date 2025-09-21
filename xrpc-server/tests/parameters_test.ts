import type { LexiconDoc } from "@atproto/lexicon";
import { XrpcClient } from "@atp/xrpc";
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

let server: ReturnType<typeof xrpcServer.createServer>;
let s: Deno.HttpServer;
let client: XrpcClient;

Deno.test.beforeAll(async () => {
  server = xrpcServer.createServer(LEXICONS);
  server.method(
    "io.example.paramTest",
    (ctx: { params: xrpcServer.Params }) => ({
      encoding: "application/json",
      body: ctx.params,
    }),
  );

  s = await createServer(server);
  const port = (s as Deno.HttpServer & { port: number }).port;
  client = new XrpcClient(`http://localhost:${port}`, LEXICONS);
});

Deno.test.afterAll(async () => {
  await closeServer(s);
});

Deno.test("validates query params with valid data", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
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
});

Deno.test("coerces query params to correct types", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
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
});

Deno.test("rejects string that is too short", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
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
});

Deno.test("rejects string that is too long", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
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
});

Deno.test("rejects when required str param is missing", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
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
});

Deno.test("rejects integer that is too small", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
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
});

Deno.test("rejects integer that is too large", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
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
});

Deno.test("rejects when required int param is missing", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
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
});

Deno.test("rejects when required bool param is missing", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
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
});

Deno.test("rejects when required array param is empty", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
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
});

Deno.test("rejects array that exceeds max length", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
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
