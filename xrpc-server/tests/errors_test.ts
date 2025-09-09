import type { LexiconDoc } from "@atproto/lexicon";
import { XrpcClient, XRPCError, XRPCInvalidResponseError } from "@atproto/xrpc";
import * as xrpcServer from "../mod.ts";
import { closeServer, createServer } from "./_util.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";

const UPSTREAM_LEXICONS: LexiconDoc[] = [
  {
    lexicon: 1,
    id: "io.example.upstreamInvalidResponse",
    defs: {
      main: {
        type: "query",
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["expectedValue"],
            properties: {
              expectedValue: { type: "string" },
            },
          },
        },
      },
    },
  },
];

const LEXICONS: LexiconDoc[] = [
  {
    lexicon: 1,
    id: "io.example.error",
    defs: {
      main: {
        type: "query",
        parameters: {
          type: "params",
          properties: {
            which: { type: "string", default: "foo" },
          },
        },
        errors: [{ name: "Foo" }, { name: "Bar" }],
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.throwFalsyValue",
    defs: {
      main: {
        type: "query",
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.query",
    defs: {
      main: {
        type: "query",
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.procedure",
    defs: {
      main: {
        type: "procedure",
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.invalidResponse",
    defs: {
      main: {
        type: "query",
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["expectedValue"],
            properties: {
              expectedValue: { type: "string" },
            },
          },
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.invalidUpstreamResponse",
    defs: {
      main: {
        type: "query",
      },
    },
  },
];

const MISMATCHED_LEXICONS: LexiconDoc[] = [
  {
    lexicon: 1,
    id: "io.example.query",
    defs: {
      main: {
        type: "procedure",
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.procedure",
    defs: {
      main: {
        type: "query",
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.doesNotExist",
    defs: {
      main: {
        type: "query",
      },
    },
  },
];

Deno.test({
  name: "Error Tests",
  async fn() {
    const upstreamServer = xrpcServer.createServer(UPSTREAM_LEXICONS, {
      validateResponse: false,
    }); // disable validateResponse to test client validation
    upstreamServer.method("io.example.upstreamInvalidResponse", () => {
      return { encoding: "json", body: { something: "else" } };
    });
    const upstreamS = await createServer(upstreamServer);
    const upstreamPort = (upstreamS as Deno.HttpServer & { port: number }).port;
    const upstreamClient = new XrpcClient(
      `http://localhost:${upstreamPort}`,
      UPSTREAM_LEXICONS,
    );

    const server = xrpcServer.createServer(LEXICONS, {
      validateResponse: false,
    }); // disable validateResponse to test client validation
    const s = await createServer(server);
    const port = (s as Deno.HttpServer & { port: number }).port;
    server.method("io.example.error", (ctx: xrpcServer.HandlerContext) => {
      if (ctx.params["which"] === "foo") {
        throw new xrpcServer.InvalidRequestError("It was this one!", "Foo");
      } else if (ctx.params["which"] === "bar") {
        return { status: 400, error: "Bar", message: "It was that one!" };
      } else {
        return { status: 400 };
      }
    });
    server.method("io.example.throwFalsyValue", () => {
      throw "";
    });
    server.method("io.example.query", () => {
      return undefined;
    });
    // @ts-ignore We're intentionally giving the wrong response! -prf
    server.method("io.example.invalidResponse", () => {
      return { encoding: "json", body: { something: "else" } };
    });
    server.method("io.example.invalidUpstreamResponse", async () => {
      await upstreamClient.call("io.example.upstreamInvalidResponse");
      return {
        encoding: "json",
        body: {},
      };
    });
    server.method("io.example.procedure", () => {
      return undefined;
    });

    const client = new XrpcClient(`http://localhost:${port}`, LEXICONS);
    const badClient = new XrpcClient(
      `http://localhost:${port}`,
      MISMATCHED_LEXICONS,
    );

    // Tests
    await Deno.test("serves requests", async () => {
      await assertRejects(
        async () => {
          await client.call("io.example.error", {
            which: "foo",
          });
        },
        XRPCError,
        "It was this one!",
      );

      const fooError = await client.call("io.example.error", { which: "foo" })
        .catch((e) => e);
      assert(fooError instanceof XRPCError);
      assert(!fooError.success);
      assertEquals(fooError.error, "Foo");

      await assertRejects(
        async () => {
          await client.call("io.example.error", {
            which: "bar",
          });
        },
        XRPCError,
        "It was that one!",
      );

      const barError = await client.call("io.example.error", { which: "bar" })
        .catch((e) => e);
      assert(barError instanceof XRPCError);
      assert(!barError.success);
      assertEquals(barError.error, "Bar");

      await assertRejects(
        async () => {
          await client.call("io.example.throwFalsyValue");
        },
        XRPCError,
        "Internal Server Error",
      );

      const falsyError = await client.call("io.example.throwFalsyValue").catch(
        (e) => e,
      );
      assert(falsyError instanceof XRPCError);
      assert(!falsyError.success);
      assertEquals(falsyError.error, "InternalServerError");

      await assertRejects(
        async () => {
          await client.call("io.example.error", {
            which: "other",
          });
        },
        XRPCError,
        "Invalid Request",
      );

      const otherError = await client.call("io.example.error", {
        which: "other",
      }).catch((e) => e);
      assert(otherError instanceof XRPCError);
      assert(!otherError.success);
      assertEquals(otherError.error, "InvalidRequest");

      await assertRejects(
        async () => {
          await client.call("io.example.invalidResponse");
        },
        XRPCInvalidResponseError,
        "The server gave an invalid response and may be out of date.",
      );

      const invalidError = await client.call("io.example.invalidResponse")
        .catch((e) => e);
      assert(invalidError instanceof XRPCInvalidResponseError);
      assert(!invalidError.success);
      assertEquals(invalidError.error, "Invalid Response");
      assertEquals(
        invalidError.validationError.message,
        'Output must have the property "expectedValue"',
      );
      assertEquals(invalidError.responseBody, { something: "else" });

      await assertRejects(
        async () => {
          await client.call("io.example.invalidUpstreamResponse");
        },
        XRPCError,
        "Internal Server Error",
      );

      const upstreamError = await client.call(
        "io.example.invalidUpstreamResponse",
      ).catch((e) => e);
      assert(upstreamError instanceof XRPCError);
      assert(!upstreamError.success);
      assertEquals(upstreamError.status, 500);
      assertEquals(upstreamError.error, "InternalServerError");
    });

    await Deno.test("serves error for missing/mismatch schemas", async () => {
      await client.call("io.example.query"); // No error
      await client.call("io.example.procedure"); // No error

      await assertRejects(
        async () => {
          await badClient.call("io.example.query");
        },
        XRPCError,
        "Incorrect HTTP method (POST) expected GET",
      );

      const queryError = await badClient.call("io.example.query").catch((e) =>
        e
      );
      assert(queryError instanceof XRPCError);
      assert(!queryError.success);
      assertEquals(queryError.error, "InvalidRequest");

      await assertRejects(
        async () => {
          await badClient.call("io.example.procedure");
        },
        XRPCError,
        "Incorrect HTTP method (GET) expected POST",
      );

      const procError = await badClient.call("io.example.procedure").catch(
        (e) => e,
      );
      assert(procError instanceof XRPCError);
      assert(!procError.success);
      assertEquals(procError.error, "InvalidRequest");

      await assertRejects(
        async () => {
          await badClient.call("io.example.doesNotExist");
        },
        XRPCError,
        "Method Not Implemented",
      );

      const notFoundError = await badClient.call("io.example.doesNotExist")
        .catch((e) => e);
      assert(notFoundError instanceof XRPCError);
      assert(!notFoundError.success);
      assertEquals(notFoundError.error, "MethodNotImplemented");
    });

    // Cleanup
    await closeServer(s);
    await closeServer(upstreamS);
  },
});
