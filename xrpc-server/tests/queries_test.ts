import type { LexiconDoc } from "@atp/lexicon";
import { XrpcClient } from "@atp/xrpc";
import * as xrpcServer from "../mod.ts";
import { closeServer, createServer } from "./_util.ts";
import { assertEquals, assertExists } from "@std/assert";

const LEXICONS: LexiconDoc[] = [
  {
    lexicon: 1,
    id: "io.example.pingOne",
    defs: {
      main: {
        type: "query",
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
        type: "query",
        parameters: {
          type: "params",
          properties: {
            message: { type: "string" },
          },
        },
        output: {
          encoding: "application/octet-stream",
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.pingThree",
    defs: {
      main: {
        type: "query",
        parameters: {
          type: "params",
          properties: {
            message: { type: "string" },
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

async function setupServer() {
  const server = xrpcServer.createServer(LEXICONS);
  server.method(
    "io.example.pingOne",
    (ctx: { params: xrpcServer.Params }) => {
      return { encoding: "text/plain", body: ctx.params.message };
    },
  );
  server.method(
    "io.example.pingTwo",
    (ctx: { params: xrpcServer.Params }) => {
      return {
        encoding: "application/octet-stream",
        body: new TextEncoder().encode(String(ctx.params.message)),
      };
    },
  );
  server.method(
    "io.example.pingThree",
    (ctx: { params: xrpcServer.Params }) => {
      return {
        encoding: "application/json",
        body: { message: ctx.params.message },
        headers: { "x-test-header-name": "test-value" },
      };
    },
  );

  const s = await createServer(server);
  const port = (s as Deno.HttpServer & { port: number }).port;
  const client = new XrpcClient(`http://localhost:${port}`, LEXICONS);

  return { server: s, client };
}

Deno.test("serves query with text/plain response", async () => {
  const { server, client } = await setupServer();
  try {
    const res1 = await client.call("io.example.pingOne", {
      message: "hello world",
    });
    assertExists(res1.success);
    assertEquals(res1.headers["content-type"], "text/plain");
    assertEquals(res1.data, "hello world");
  } finally {
    await closeServer(server);
  }
});

Deno.test("serves query with octet-stream response", async () => {
  const { server, client } = await setupServer();
  try {
    const res2 = await client.call("io.example.pingTwo", {
      message: "hello world",
    });
    assertExists(res2.success);
    assertEquals(res2.headers["content-type"], "application/octet-stream");
    assertEquals(new TextDecoder().decode(res2.data), "hello world");
  } finally {
    await closeServer(server);
  }
});

Deno.test("serves query with JSON response and custom headers", async () => {
  const { server, client } = await setupServer();
  try {
    const res3 = await client.call("io.example.pingThree", {
      message: "hello world",
    });
    assertExists(res3.success);
    assertEquals(
      res3.headers["content-type"],
      "application/json",
    );
    assertEquals(
      (res3.data as Record<string, unknown>)?.message,
      "hello world",
    );
    assertEquals(res3.headers["x-test-header-name"], "test-value");
  } finally {
    await closeServer(server);
  }
});
