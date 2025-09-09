import { cidForCbor } from "@atproto/common";
import { randomBytes } from "@atproto/crypto";
import type { LexiconDoc } from "@atproto/lexicon";
import { ResponseType, XrpcClient, XRPCError } from "@atproto/xrpc";
import * as xrpcServer from "../mod.ts";
import { logger } from "../logger.ts";
import { closeServer, createServer } from "./_util.ts";
import {
  assert,
  assertEquals,
  assertObjectMatch,
  assertRejects,
} from "@std/assert";

// Web-standard compression helpers
async function compressData(
  data: Uint8Array,
  format: CompressionFormat,
): Promise<Uint8Array> {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
  const compressedStream = stream.pipeThrough(new CompressionStream(format));
  return new Uint8Array(await new Response(compressedStream).arrayBuffer());
}

const LEXICONS: LexiconDoc[] = [
  {
    lexicon: 1,
    id: "io.example.validationTest",
    defs: {
      main: {
        type: "procedure",
        input: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["foo"],
            properties: {
              foo: { type: "string" },
              bar: { type: "integer" },
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["foo"],
            properties: {
              foo: { type: "string" },
              bar: { type: "integer" },
            },
          },
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.validationTestTwo",
    defs: {
      main: {
        type: "query",
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["foo"],
            properties: {
              foo: { type: "string" },
              bar: { type: "integer" },
            },
          },
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.blobTest",
    defs: {
      main: {
        type: "procedure",
        input: {
          encoding: "*/*",
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["cid"],
            properties: {
              cid: { type: "string" },
            },
          },
        },
      },
    },
  },
];

const BLOB_LIMIT = 5000;

async function consumeInput(
  input: ReadableStream | string | object,
): Promise<Uint8Array> {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (typeof input === "string") {
    return new TextEncoder().encode(input);
  }
  if (input instanceof ReadableStream) {
    try {
      const chunks: Uint8Array[] = [];
      for await (const chunk of input) {
        chunks.push(
          chunk instanceof Uint8Array ? chunk : new TextEncoder().encode(chunk),
        );
      }
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result;
    } catch (err) {
      if (err instanceof XRPCError) {
        throw err;
      } else {
        throw new XRPCError(
          ResponseType.InvalidRequest,
          "unable to read input",
        );
      }
    }
  }
  throw new Error("Invalid input");
}

Deno.test({
  name: "Bodies Tests",
  async fn() {
    const server = xrpcServer.createServer(LEXICONS, {
      payload: {
        blobLimit: BLOB_LIMIT,
      },
    });
    server.method(
      "io.example.validationTest",
      (ctx: xrpcServer.HandlerContext) => {
        if (ctx.input?.body instanceof ReadableStream) {
          throw new Error("Input is readable");
        }

        return {
          encoding: "json",
          body: ctx.input?.body ?? null,
        };
      },
    );
    server.method("io.example.validationTestTwo", () => ({
      encoding: "json",
      body: { wrong: "data" },
    }));
    server.method(
      "io.example.blobTest",
      async (ctx: xrpcServer.HandlerContext) => {
        const buffer = await consumeInput(
          ctx.input?.body as string | object | ReadableStream,
        );
        const cid = await cidForCbor(buffer);
        return {
          encoding: "json",
          body: { cid: cid.toString() },
        };
      },
    );

    // Setup
    const s = await createServer(server);
    const port = (s as Deno.HttpServer & { port: number }).port;
    const url = `http://localhost:${port}`;
    const client = new XrpcClient(url, LEXICONS);

    // Tests
    await Deno.test("validates input and output bodies", async () => {
      const res1 = await client.call(
        "io.example.validationTest",
        {},
        {
          foo: "hello",
          bar: 123,
        },
      );
      assert(res1.success);
      assertEquals(res1.data.foo, "hello");
      assertEquals(res1.data.bar, 123);

      await assertRejects(
        () => client.call("io.example.validationTest", {}),
        Error,
        "Request encoding (Content-Type) required but not provided",
      );

      await assertRejects(
        () => client.call("io.example.validationTest", {}, {}),
        Error,
        'Input must have the property "foo"',
      );

      await assertRejects(
        () => client.call("io.example.validationTest", {}, { foo: 123 }),
        Error,
        "Input/foo must be a string",
      );

      await assertRejects(
        () =>
          client.call(
            "io.example.validationTest",
            {},
            { foo: "hello", bar: 123 },
            { encoding: "image/jpeg" },
          ),
        Error,
        "Unable to encode object as image/jpeg data",
      );

      await assertRejects(
        () =>
          client.call(
            "io.example.validationTest",
            {},
            new Blob([randomBytes(123)], { type: "image/jpeg" }),
          ),
        Error,
        "Wrong request encoding (Content-Type): image/jpeg",
      );

      await assertRejects(
        () =>
          client.call(
            "io.example.validationTest",
            {},
            (() => {
              const formData = new FormData();
              formData.append("foo", "bar");
              return formData;
            })(),
          ),
        Error,
        "Wrong request encoding (Content-Type): multipart/form-data",
      );

      await assertRejects(
        () =>
          client.call(
            "io.example.validationTest",
            {},
            new URLSearchParams([["foo", "bar"]]),
          ),
        Error,
        "Wrong request encoding (Content-Type): application/x-www-form-urlencoded",
      );

      await assertRejects(
        () =>
          client.call(
            "io.example.validationTest",
            {},
            new Blob([new Uint8Array([1])]),
          ),
        Error,
        "Wrong request encoding (Content-Type): application/octet-stream",
      );

      await assertRejects(
        () =>
          client.call(
            "io.example.validationTest",
            {},
            new ReadableStream({
              pull(ctrl) {
                ctrl.enqueue(new Uint8Array([1]));
                ctrl.close();
              },
            }),
          ),
        Error,
        "Wrong request encoding (Content-Type): application/octet-stream",
      );

      await assertRejects(
        () => client.call("io.example.validationTest", {}, new Uint8Array([1])),
        Error,
        "Wrong request encoding (Content-Type): application/octet-stream",
      );

      // 500 responses don't include details, so we nab details from the logger
      const originalError = logger.error;
      let loggedError: { err: { message: string } } | undefined;
      logger.error = (obj: unknown) => {
        loggedError = obj as { err: { message: string } };
      };

      try {
        await assertRejects(
          () => client.call("io.example.validationTestTwo"),
          Error,
          "Internal Server Error",
        );

        assert(loggedError);
        assertObjectMatch(loggedError, {
          err: {
            message: 'Output must have the property "foo"',
          },
        });
      } finally {
        logger.error = originalError;
      }
    });

    await Deno.test("supports ArrayBuffers", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);

      const bytesResponse = await client.call(
        "io.example.blobTest",
        {},
        bytes,
        {
          encoding: "application/octet-stream",
        },
      );
      assertEquals(bytesResponse.data.cid, expectedCid.toString());
    });

    await Deno.test("supports empty payload on procedures with encoding", async () => {
      const bytes = new Uint8Array(0);
      const expectedCid = await cidForCbor(bytes);
      const bytesResponse = await client.call("io.example.blobTest", {}, bytes);
      assertEquals(bytesResponse.data.cid, expectedCid.toString());
    });

    await Deno.test("supports upload of empty txt file", async () => {
      const txtFile = new Blob([], { type: "text/plain" });
      const expectedCid = await cidForCbor(await txtFile.arrayBuffer());
      const fileResponse = await client.call(
        "io.example.blobTest",
        {},
        txtFile,
      );
      assertEquals(fileResponse.data.cid, expectedCid.toString());
    });

    // This does not work because the xrpc-server will add a json middleware
    // regardless of the "input" definition. This is probably a behavior that
    // should be fixed in the xrpc-server.
    await Deno.test({
      name: "supports upload of json data",
      ignore: true,
      async fn() {
        const jsonFile = new Blob([
          new TextEncoder().encode(`{"foo":"bar","baz":[3, null]}`),
        ], {
          type: "application/json",
        });
        const expectedCid = await cidForCbor(await jsonFile.arrayBuffer());
        const fileResponse = await client.call(
          "io.example.blobTest",
          {},
          jsonFile,
        );
        assertEquals(fileResponse.data.cid, expectedCid.toString());
      },
    });

    await Deno.test("supports ArrayBufferView", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);

      const bufferResponse = await client.call(
        "io.example.blobTest",
        {},
        new Uint8Array(bytes),
      );
      assertEquals(bufferResponse.data.cid, expectedCid.toString());
    });

    await Deno.test("supports Blob", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);

      const blobResponse = await client.call(
        "io.example.blobTest",
        {},
        new Blob([bytes], { type: "application/octet-stream" }),
      );
      assertEquals(blobResponse.data.cid, expectedCid.toString());
    });

    await Deno.test("supports Blob without explicit type", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);

      const blobResponse = await client.call(
        "io.example.blobTest",
        {},
        new Blob([bytes]),
      );
      assertEquals(blobResponse.data.cid, expectedCid.toString());
    });

    await Deno.test("supports ReadableStream", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);

      const streamResponse = await client.call(
        "io.example.blobTest",
        {},
        // ReadableStream.from not available in node < 20
        new ReadableStream({
          pull(ctrl) {
            ctrl.enqueue(bytes);
            ctrl.close();
          },
        }),
      );
      assertEquals(streamResponse.data.cid, expectedCid.toString());
    });

    await Deno.test("supports blob uploads", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);

      const { data } = await client.call("io.example.blobTest", {}, bytes, {
        encoding: "application/octet-stream",
      });
      assertEquals(data.cid, expectedCid.toString());
    });

    await Deno.test("supports identity encoding", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);

      const { data } = await client.call("io.example.blobTest", {}, bytes, {
        encoding: "application/octet-stream",
        headers: { "content-encoding": "identity" },
      });
      assertEquals(data.cid, expectedCid.toString());
    });

    await Deno.test("supports gzip encoding", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);
      const compressedBytes = await compressData(bytes, "gzip");

      const { data } = await client.call(
        "io.example.blobTest",
        {},
        compressedBytes,
        {
          encoding: "application/octet-stream",
          headers: {
            "content-encoding": "gzip",
          },
        },
      );
      assertEquals(data.cid, expectedCid.toString());
    });

    await Deno.test("supports deflate encoding", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);
      const compressedBytes = await compressData(bytes, "deflate");

      const { data } = await client.call(
        "io.example.blobTest",
        {},
        compressedBytes,
        {
          encoding: "application/octet-stream",
          headers: {
            "content-encoding": "deflate",
          },
        },
      );
      assertEquals(data.cid, expectedCid.toString());
    });

    await Deno.test("supports br encoding", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);
      // Note: Using gzip as fallback since brotli compression isn't widely supported
      const compressedBytes = await compressData(bytes, "gzip");

      const { data } = await client.call(
        "io.example.blobTest",
        {},
        compressedBytes,
        {
          encoding: "application/octet-stream",
          headers: {
            "content-encoding": "br",
          },
        },
      );
      assertEquals(data.cid, expectedCid.toString());
    });

    await Deno.test("supports multiple encodings", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);

      // Apply multiple compressions in sequence
      const gzipped = await compressData(bytes, "gzip");
      const deflated = await compressData(gzipped, "deflate");
      const final = await compressData(deflated, "gzip"); // Using gzip instead of br

      const { data } = await client.call(
        "io.example.blobTest",
        {},
        final,
        {
          encoding: "application/octet-stream",
          headers: {
            "content-encoding":
              "gzip, identity, deflate, identity, br, identity",
          },
        },
      );
      assertEquals(data.cid, expectedCid.toString());
    });

    await Deno.test("fails gracefully on invalid encodings", async () => {
      const bytes = randomBytes(1024);
      const compressedBytes = await compressData(bytes, "gzip");

      await assertRejects(
        () =>
          client.call(
            "io.example.blobTest",
            {},
            compressedBytes,
            {
              encoding: "application/octet-stream",
              headers: {
                "content-encoding": "gzip",
              },
            },
          ),
        Error,
        "unable to read input",
      );
    });

    await Deno.test("supports empty payload", async () => {
      const bytes = new Uint8Array(0);
      const expectedCid = await cidForCbor(bytes);

      // Using "undefined" as body to avoid encoding as lexicon { $bytes: "<base64>" }
      const result = await client.call("io.example.blobTest", {}, bytes, {
        encoding: "text/plain",
      });

      assertEquals(result.data.cid, expectedCid.toString());
    });

    await Deno.test("supports max blob size (based on content-length)", async () => {
      const bytes = randomBytes(BLOB_LIMIT + 1);

      // Exactly the number of allowed bytes
      await client.call("io.example.blobTest", {}, bytes.slice(0, BLOB_LIMIT), {
        encoding: "application/octet-stream",
      });

      // Over the number of allowed bytes
      await assertRejects(
        () =>
          client.call("io.example.blobTest", {}, bytes, {
            encoding: "application/octet-stream",
          }),
        Error,
        "request entity too large",
      );
    });

    await Deno.test("supports max blob size (missing content-length)", async () => {
      // We stream bytes in these tests so that content-length isn't included.
      const bytes = randomBytes(BLOB_LIMIT + 1);

      // Exactly the number of allowed bytes
      await client.call(
        "io.example.blobTest",
        {},
        bytesToReadableStream(bytes.slice(0, BLOB_LIMIT)),
        {
          encoding: "application/octet-stream",
        },
      );

      // Over the number of allowed bytes.
      await assertRejects(
        () =>
          client.call(
            "io.example.blobTest",
            {},
            bytesToReadableStream(bytes),
            {
              encoding: "application/octet-stream",
            },
          ),
        Error,
        "request entity too large",
      );
    });

    await Deno.test("requires any parsable Content-Type for blob uploads", async () => {
      // not a real mimetype, but correct syntax
      await client.call("io.example.blobTest", {}, randomBytes(BLOB_LIMIT), {
        encoding: "some/thing",
      });
    });

    await Deno.test("errors on an empty Content-type on blob upload", async () => {
      // empty mimetype, but correct syntax
      const res = await fetch(`${url}/xrpc/io.example.blobTest`, {
        method: "post",
        headers: { "Content-Type": "" },
        body: randomBytes(BLOB_LIMIT),
        // @ts-ignore see note in @atproto/xrpc/client.ts
        duplex: "half",
      });
      const resBody = await res.json();
      const status = res.status;
      assertEquals(status, 400);
      assertObjectMatch(resBody, {
        error: "InvalidRequest",
        message: "Request encoding (Content-Type) required but not provided",
      });
    });

    // Cleanup
    await closeServer(s);
  },
});

const bytesToReadableStream = (bytes: Uint8Array): ReadableStream => {
  // not using ReadableStream.from(), which lacks support in some contexts including nodejs v18.
  return new ReadableStream({
    pull(ctrl) {
      ctrl.enqueue(bytes);
      ctrl.close();
    },
  });
};
