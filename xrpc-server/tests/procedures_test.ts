import type { LexiconDoc } from "@atproto/lexicon";
import { XrpcClient } from "@atp/xrpc";
import * as xrpcServer from "../mod.ts";
import { closeServer, createServer } from "./_util.ts";
import { assertEquals } from "@std/assert";

const LEXICONS: LexiconDoc[] = [
  {
    lexicon: 1,
    id: "io.example.pingOne",
    defs: {
      main: {
        type: "procedure",
        parameters: {
          type: "params",
          properties: {
            message: { type: "string" },
          },
        },
        output: {
          encoding: "text/plain",
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.pingTwo",
    defs: {
      main: {
        type: "procedure",
        input: {
          encoding: "text/plain",
        },
        output: {
          encoding: "text/plain",
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.pingThree",
    defs: {
      main: {
        type: "procedure",
        input: {
          encoding: "application/octet-stream",
        },
        output: {
          encoding: "application/octet-stream",
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.pingFour",
    defs: {
      main: {
        type: "procedure",
        input: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["message"],
            properties: { message: { type: "string" } },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["message"],
            properties: { message: { type: "string" } },
          },
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
    "io.example.pingOne",
    (ctx: xrpcServer.HandlerContext) => {
      return { encoding: "text/plain", body: ctx.params.message };
    },
  );
  server.method(
    "io.example.pingTwo",
    (ctx: xrpcServer.HandlerContext) => {
      return { encoding: "text/plain", body: ctx.input?.body };
    },
  );
  server.method(
    "io.example.pingThree",
    (ctx: xrpcServer.HandlerContext) => {
      return {
        encoding: "application/octet-stream",
        body: ctx.input?.body,
      };
    },
  );
  server.method(
    "io.example.pingFour",
    (ctx: xrpcServer.HandlerContext) => {
      const body = ctx.input?.body as { message: string };
      return {
        encoding: "application/json",
        body: { message: body?.message },
      };
    },
  );

  s = await createServer(server);
  const port = (s as Deno.HttpServer & { port: number }).port;
  client = new XrpcClient(`http://localhost:${port}`, LEXICONS);
});

Deno.test.afterAll(async () => {
  await closeServer(s);
});

Deno.test("serves procedure with query parameters", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const res1 = await client.call("io.example.pingOne", {
    message: "hello world",
  });
  assertEquals(res1.success, true);
  assertEquals(res1.headers["content-type"], "text/plain");
  assertEquals(res1.data, "hello world");
});

Deno.test("serves procedure with text/plain input", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const res2 = await client.call(
    "io.example.pingTwo",
    {},
    "hello world",
    {
      encoding: "text/plain",
    },
  );
  assertEquals(res2.success, true);
  assertEquals(res2.headers["content-type"], "text/plain");
  assertEquals(res2.data, "hello world");
});

Deno.test("serves procedure with octet-stream input", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const res3 = await client.call(
    "io.example.pingThree",
    {},
    new TextEncoder().encode("hello world"),
    { encoding: "application/octet-stream" },
  );
  assertEquals(res3.success, true);
  assertEquals(res3.headers["content-type"], "application/octet-stream");
  assertEquals(new TextDecoder().decode(res3.data), "hello world");
});

Deno.test("serves procedure with JSON input", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const res4 = await client.call(
    "io.example.pingFour",
    {},
    { message: "hello world" },
  );
  assertEquals(res4.success, true);
  assertEquals(
    res4.headers["content-type"],
    "application/json",
  );
  assertEquals(res4.data?.message, "hello world");
});
