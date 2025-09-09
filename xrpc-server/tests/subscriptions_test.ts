import { WebSocket, type WebSocketServer } from "ws";
import { wait } from "@atp/common";
import type { LexiconDoc } from "@atproto/lexicon";
import {
  byFrame,
  ErrorFrame,
  type Frame,
  MessageFrame,
  Subscription,
} from "../mod.ts";
import * as xrpcServer from "../mod.ts";
import {
  basicAuthHeaders,
  closeServer,
  createServer,
  createStreamBasicAuth,
} from "./_util.ts";
import { assertEquals, assertGreater, assertRejects } from "@std/assert";

const LEXICONS: LexiconDoc[] = [
  {
    lexicon: 1,
    id: "io.example.streamOne",
    defs: {
      main: {
        type: "subscription",
        parameters: {
          type: "params",
          required: ["countdown"],
          properties: {
            countdown: { type: "integer" },
          },
        },
        message: {
          schema: {
            type: "object",
            required: ["count"],
            properties: { count: { type: "integer" } },
          },
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.streamTwo",
    defs: {
      main: {
        type: "subscription",
        parameters: {
          type: "params",
          required: ["countdown"],
          properties: {
            countdown: { type: "integer" },
          },
        },
        message: {
          schema: {
            type: "union",
            refs: ["#even", "#odd"],
          },
        },
      },
      even: {
        type: "object",
        required: ["count"],
        properties: { count: { type: "integer" } },
      },
      odd: {
        type: "object",
        required: ["count"],
        properties: { count: { type: "integer" } },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.streamAuth",
    defs: {
      main: {
        type: "subscription",
      },
    },
  },
];

Deno.test({
  name: "Subscriptions",
  async fn() {
    let s: Deno.HttpServer;
    const server = xrpcServer.createServer(LEXICONS);
    const lex = server.lex;

    server.streamMethod(
      "io.example.streamOne",
      async function* ({ params }: { params: xrpcServer.Params }) {
        const countdown = Number(params.countdown ?? 0);
        for (let i = countdown; i >= 0; i--) {
          await wait(0);
          yield { count: i };
        }
      },
    );

    server.streamMethod(
      "io.example.streamTwo",
      async function* ({ params }: { params: xrpcServer.Params }) {
        const countdown = Number(params.countdown ?? 0);
        for (let i = countdown; i >= 0; i--) {
          await wait(200);
          yield {
            $type: i % 2 === 0 ? "#even" : "io.example.streamTwo#odd",
            count: i,
          };
        }
        yield {
          $type: "io.example.otherNsid#done",
        };
      },
    );

    server.streamMethod("io.example.streamAuth", {
      auth: createStreamBasicAuth({ username: "admin", password: "password" }),
      handler: async function* ({ auth }: { auth: unknown }) {
        yield auth;
      },
    });

    let addr: Deno.Addr;

    // Setup server before tests
    s = await createServer(server);
    addr = (s as Deno.HttpServer).addr;

    try {
      Deno.test("streams messages", async () => {
        const ws = new WebSocket(
          `ws://${addr}/xrpc/io.example.streamOne?countdown=5`,
        );

        const frames: Frame[] = [];
        for await (const frame of byFrame(ws)) {
          frames.push(frame);
        }

        assertEquals(frames, [
          new MessageFrame({ count: 5 }),
          new MessageFrame({ count: 4 }),
          new MessageFrame({ count: 3 }),
          new MessageFrame({ count: 2 }),
          new MessageFrame({ count: 1 }),
          new MessageFrame({ count: 0 }),
        ]);
      });

      Deno.test("streams messages in a union", async () => {
        const ws = new WebSocket(
          `ws://${addr}/xrpc/io.example.streamTwo?countdown=5`,
        );

        const frames: Frame[] = [];
        for await (const frame of byFrame(ws)) {
          frames.push(frame);
        }

        assertEquals(frames, [
          new MessageFrame({ count: 5 }, { type: "#odd" }),
          new MessageFrame({ count: 4 }, { type: "#even" }),
          new MessageFrame({ count: 3 }, { type: "#odd" }),
          new MessageFrame({ count: 2 }, { type: "#even" }),
          new MessageFrame({ count: 1 }, { type: "#odd" }),
          new MessageFrame({ count: 0 }, { type: "#even" }),
          new MessageFrame({}, { type: "io.example.otherNsid#done" }),
        ]);
      });

      Deno.test("resolves auth into handler", async () => {
        const ws = new WebSocket(
          `ws://${addr}/xrpc/io.example.streamAuth`,
          {
            headers: basicAuthHeaders({
              username: "admin",
              password: "password",
            }),
          },
        );

        const frames: Frame[] = [];
        for await (const frame of byFrame(ws)) {
          frames.push(frame);
        }

        assertEquals(frames, [
          new MessageFrame({
            credentials: {
              username: "admin",
            },
            artifacts: {
              original: "YWRtaW46cGFzc3dvcmQ=",
            },
          }),
        ]);
      });

      Deno.test("errors immediately on bad parameter", async () => {
        const ws = new WebSocket(
          `ws://${addr}/xrpc/io.example.streamOne`,
        );

        const frames: Frame[] = [];
        for await (const frame of byFrame(ws)) {
          frames.push(frame);
        }

        assertEquals(frames, [
          new ErrorFrame({
            error: "InvalidRequest",
            message: 'Error: Params must have the property "countdown"',
          }),
        ]);
      });

      Deno.test("errors immediately on bad auth", async () => {
        const ws = new WebSocket(
          `ws://${addr}/xrpc/io.example.streamAuth`,
          {
            headers: basicAuthHeaders({
              username: "bad",
              password: "wrong",
            }),
          },
        );

        const frames: Frame[] = [];
        for await (const frame of byFrame(ws)) {
          frames.push(frame);
        }

        assertEquals(frames, [
          new ErrorFrame({
            error: "AuthenticationRequired",
            message: "Authentication Required",
          }),
        ]);
      });

      Deno.test("does not websocket upgrade at bad endpoint", async () => {
        const ws = new WebSocket(`ws://${addr}/xrpc/does.not.exist`);
        await assertRejects(
          () =>
            new Promise((_, reject) => {
              ws.onerror = () => reject(new Error("ECONNRESET"));
            }),
          Error,
          "ECONNRESET",
        );
      });

      Deno.test("subscription consumer tests", async (t) => {
        await t.step("receives messages w/ skips", async () => {
          const sub = new Subscription({
            service: `ws://${addr}`,
            method: "io.example.streamOne",
            getParams: () => ({ countdown: 5 }),
            validate: (obj: unknown) => {
              const result = lex.assertValidXrpcMessage<{ count: number }>(
                "io.example.streamOne",
                obj,
              );
              if (!result.count || result.count % 2) {
                return result;
              }
            },
          });

          const messages: { count: number }[] = [];
          for await (const msg of sub) {
            const typedMsg = msg as { count: number };
            messages.push(typedMsg);
          }

          assertEquals(messages, [
            { count: 5 },
            { count: 3 },
            { count: 1 },
            { count: 0 },
          ]);
        });

        await t.step("reconnects w/ param update", async () => {
          let countdown = 10;
          let reconnects = 0;
          const sub = new Subscription({
            service: `ws://${addr}`,
            method: "io.example.streamOne",
            onReconnectError: () => reconnects++,
            getParams: () => ({ countdown }),
            validate: (obj: unknown) => {
              return lex.assertValidXrpcMessage<{ count: number }>(
                "io.example.streamOne",
                obj,
              );
            },
          });

          let disconnected = false;
          for await (const msg of sub) {
            const typedMsg = msg as { count: number };
            assertEquals(typedMsg.count >= countdown - 1, true); // No skips
            countdown = Math.min(countdown, typedMsg.count); // Only allow forward movement
            if (typedMsg.count <= 6 && !disconnected) {
              disconnected = true;
              server.subscriptions.forEach(
                ({ wss }: { wss: WebSocketServer }) => {
                  wss.clients.forEach((c: WebSocket) => c.terminate());
                },
              );
            }
          }

          assertEquals(countdown, 0);
          assertGreater(reconnects, 0);
        });

        await t.step("aborts with signal", async () => {
          const abortController = new AbortController();
          const sub = new Subscription({
            service: `ws://${addr}`,
            method: "io.example.streamOne",
            signal: abortController.signal,
            getParams: () => ({ countdown: 10 }),
            validate: (obj: unknown) => {
              const result = lex.assertValidXrpcMessage<{ count: number }>(
                "io.example.streamOne",
                obj,
              );
              return result;
            },
          });

          let error: unknown;
          let disconnected = false;
          const messages: { count: number }[] = [];
          try {
            for await (const msg of sub) {
              const typedMsg = msg as { count: number };
              messages.push(typedMsg);
              if (typedMsg.count <= 6 && !disconnected) {
                disconnected = true;
                abortController.abort(new Error("Oops!"));
              }
            }
          } catch (err) {
            error = err;
          }

          assertEquals(error, new Error("Oops!"));
          assertEquals(messages, [
            { count: 10 },
            { count: 9 },
            { count: 8 },
            { count: 7 },
            { count: 6 },
          ]);
        });
      });

      Deno.test("closing websocket server while client connected", async (t) => {
        // First close the current server
        if (s) {
          await closeServer(s);
        }

        await t.step(
          "uses heartbeat to reconnect if connection dropped",
          async () => {
            // Run a server that pauses longer than heartbeat interval on first connection
            const localPort = 6003;
            const server = Deno.serve(
              { port: localPort },
              () => new Response(),
            );
            const firstWasClosed = false;
            const firstSocketClosed = new Promise<void>((resolve) => {
              // TODO: Implement WebSocket server handling in Deno
              resolve();
            });

            const subscription = new Subscription({
              service: `ws://localhost:${localPort}`,
              method: "",
              heartbeatIntervalMs: 500,
              validate: (obj: unknown) => {
                return lex.assertValidXrpcMessage<{ count: number }>(
                  "io.example.streamOne",
                  obj,
                );
              },
            });

            const messages: { count: number }[] = [];
            for await (const msg of subscription) {
              const typedMsg = msg as { count: number };
              messages.push(typedMsg);
            }

            await firstSocketClosed;
            assertEquals(messages, [{ count: 1 }]);
            assertEquals(firstWasClosed, true);
            await server.shutdown();
          },
        );

        // Restart the server for other tests
        s = await createServer(server);
        addr = (s as Deno.HttpServer).addr;
      });
    } finally {
      // Cleanup
      if (s) await closeServer(s);
    }
  },
});
