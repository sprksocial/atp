import { cidForCbor } from "@atp/common";
import { randomBytes } from "@atp/crypto";
import type { LexiconDoc } from "@atp/lexicon";
import { ResponseType, XrpcClient, XRPCError } from "./_xrpc-client.ts";
import * as xrpcServer from "../mod.ts";
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
  async fn(t: Deno.TestContext) {
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
          encoding: "application/json",
          body: ctx.input?.body ?? null,
        };
      },
    );
    server.method("io.example.validationTestTwo", () => ({
      encoding: "application/json",
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
          encoding: "application/json",
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
    await t.step("validates input and output bodies", async () => {
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
      );

      await assertRejects(
        () => client.call("io.example.validationTest", {}, {}),
        Error,
      );

      await assertRejects(
        () => client.call("io.example.validationTest", {}, { foo: 123 }),
        Error,
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
      );

      await assertRejects(
        () =>
          client.call(
            "io.example.validationTest",
            {},
            new Blob([new Uint8Array(randomBytes(123))], {
              type: "image/jpeg",
            }),
          ),
        Error,
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
      );

      await assertRejects(
        () =>
          client.call(
            "io.example.validationTest",
            {},
            new URLSearchParams([["foo", "bar"]]),
          ),
        Error,
      );

      await assertRejects(
        () =>
          client.call(
            "io.example.validationTest",
            {},
            new Blob([new Uint8Array([1])]),
          ),
        Error,
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
      );

      await assertRejects(
        () => client.call("io.example.validationTest", {}, new Uint8Array([1])),
        Error,
      );

      await assertRejects(
        () => client.call("io.example.validationTestTwo"),
        Error,
        "The server gave an invalid response and may be out of date.",
      );
    });

    await t.step("supports ArrayBuffers", async () => {
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

    await t.step(
      "supports empty payload on procedures with encoding",
      async () => {
        const bytes = new Uint8Array(0);
        const expectedCid = await cidForCbor(bytes);
        const bytesResponse = await client.call(
          "io.example.blobTest",
          {},
          bytes,
        );
        assertEquals(bytesResponse.data.cid, expectedCid.toString());
      },
    );

    await t.step("supports upload of empty txt file", async () => {
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
    await t.step({
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

    await t.step("supports ArrayBufferView", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);

      const bufferResponse = await client.call(
        "io.example.blobTest",
        {},
        new Uint8Array(bytes),
      );
      assertEquals(bufferResponse.data.cid, expectedCid.toString());
    });

    await t.step("supports Blob", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);

      const blobResponse = await client.call(
        "io.example.blobTest",
        {},
        new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" }),
      );
      assertEquals(blobResponse.data.cid, expectedCid.toString());
    });

    await t.step("supports Blob without explicit type", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);

      const blobResponse = await client.call(
        "io.example.blobTest",
        {},
        new Blob([new Uint8Array(bytes)]),
      );
      assertEquals(blobResponse.data.cid, expectedCid.toString());
    });

    await t.step("supports ReadableStream", async () => {
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

    await t.step("supports blob uploads", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);

      const { data } = await client.call("io.example.blobTest", {}, bytes, {
        encoding: "application/octet-stream",
      });
      assertEquals(data.cid, expectedCid.toString());
    });

    await t.step("supports identity encoding", async () => {
      const bytes = randomBytes(1024);
      const expectedCid = await cidForCbor(bytes);

      const { data } = await client.call("io.example.blobTest", {}, bytes, {
        encoding: "application/octet-stream",
        headers: { "content-encoding": "identity" },
      });
      assertEquals(data.cid, expectedCid.toString());
    });

    await t.step("supports gzip encoding", async () => {
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

    await t.step("supports deflate encoding", async () => {
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

    await t.step("rejects unsupported br encoding", async () => {
      const bytes = randomBytes(1024);
      await assertRejects(
        () =>
          client.call("io.example.blobTest", {}, bytes, {
            encoding: "application/octet-stream",
            headers: {
              "content-encoding": "br",
            },
          }),
        Error,
        "unsupported content-encoding",
      );
    });

    await t.step("rejects unsupported multiple encodings", async () => {
      const bytes = randomBytes(1024);
      await assertRejects(
        () =>
          client.call("io.example.blobTest", {}, bytes, {
            encoding: "application/octet-stream",
            headers: {
              "content-encoding":
                "gzip, identity, deflate, identity, br, identity",
            },
          }),
        Error,
        "unsupported content-encoding",
      );
    });

    await t.step("fails gracefully on invalid encodings", async () => {
      const bytes = randomBytes(1024);

      await assertRejects(
        () =>
          client.call(
            "io.example.blobTest",
            {},
            bytes,
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

    await t.step("supports empty payload", async () => {
      const bytes = new Uint8Array(0);
      const expectedCid = await cidForCbor(bytes);

      // Using "undefined" as body to avoid encoding as lexicon { $bytes: "<base64>" }
      const result = await client.call("io.example.blobTest", {}, bytes, {
        encoding: "text/plain",
      });

      assertEquals(result.data.cid, expectedCid.toString());
    });

    await t.step({
      name: "supports max blob size (based on content-length)",
      ignore: true,
      async fn() {
        const bytes = randomBytes(BLOB_LIMIT + 1);

        await client.call(
          "io.example.blobTest",
          {},
          bytes.slice(0, BLOB_LIMIT),
          {
            encoding: "application/octet-stream",
          },
        );

        await assertRejects(
          () =>
            client.call("io.example.blobTest", {}, bytes, {
              encoding: "application/octet-stream",
            }),
          Error,
          "request entity too large",
        );
      },
    });

    await t.step({
      name: "supports max blob size (missing content-length)",
      ignore: true,
      async fn() {
        const bytes = randomBytes(BLOB_LIMIT + 1);

        await client.call(
          "io.example.blobTest",
          {},
          bytesToReadableStream(bytes.slice(0, BLOB_LIMIT)),
          {
            encoding: "application/octet-stream",
          },
        );

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
      },
    });

    await t.step(
      "requires any parsable Content-Type for blob uploads",
      async () => {
        // not a real mimetype, but correct syntax
        await client.call("io.example.blobTest", {}, randomBytes(BLOB_LIMIT), {
          encoding: "some/thing",
        });
      },
    );

    await t.step("errors on an empty Content-type on blob upload", async () => {
      // empty mimetype, but correct syntax
      const res = await fetch(`${url}/xrpc/io.example.blobTest`, {
        method: "post",
        headers: { "Content-Type": "" },
        body: new Uint8Array(randomBytes(BLOB_LIMIT)),
        // @ts-ignore see note in @atp/xrpc/client.ts
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
