import { assertEquals, assertRejects } from "@std/assert";
import { Client, XRPCError } from "@atp/xrpc";
import { l } from "@atp/lex";
import { byFrame, MessageFrame } from "../mod.ts";
import * as xrpcServer from "../mod.ts";
import { closeServer, createServer } from "./_util.ts";

const echoQuery = l.query(
  "io.example.echoQuery",
  l.params({
    message: l.string(),
  }),
  l.jsonPayload({
    message: l.string(),
  }),
);

const passthroughExtraQuery = l.query(
  "io.example.passthroughExtraQuery",
  l.params({
    message: l.string(),
  }),
  l.jsonPayload({
    message: l.string(),
    extra: l.optional(l.string()),
  }),
);

const echoProcedure = l.procedure(
  "io.example.echoProcedure",
  l.params(),
  l.jsonPayload({
    message: l.string(),
  }),
  l.jsonPayload({
    message: l.string(),
  }),
);

const echoBinaryProcedure = l.procedure(
  "io.example.echoBinaryProcedure",
  l.params(),
  l.payload("application/octet-stream", l.bytes()),
  l.payload("application/octet-stream", l.bytes()),
);

const limitedBinaryProcedure = l.procedure(
  "io.example.limitedBinaryProcedure",
  l.params(),
  l.payload("application/octet-stream", l.bytes()),
  l.jsonPayload({
    ok: l.boolean(),
  }),
);

const countSubscription = l.subscription(
  "io.example.countSubscription",
  l.params({
    count: l.integer(),
  }),
  l.object({
    count: l.integer(),
  }),
);

type Expect<T extends true> = T;
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true
  : false;
type StreamAuth<T> = T extends (
  ctx: infer C,
) => AsyncIterable<unknown> ? C extends { auth: infer A } ? A : never
  : never;
type _lexSubscriptionHandlerAuth = Expect<
  Equals<
    StreamAuth<xrpcServer.LexSubscriptionHandler<typeof countSubscription>>,
    xrpcServer.Auth
  >
>;

const oddCountMessage = l.typedObject(
  "io.example.typedCountSubscription",
  "odd",
  l.object({
    count: l.integer(),
  }),
);

const evenCountMessage = l.typedObject(
  "io.example.typedCountSubscription",
  "even",
  l.object({
    count: l.integer(),
  }),
);

const typedCountSubscription = l.subscription(
  "io.example.typedCountSubscription",
  l.params({
    count: l.integer(),
  }),
  l.typedUnion([
    l.typedRef(() => oddCountMessage),
    l.typedRef(() => evenCountMessage),
  ], false),
);

const invalidQuery = l.query(
  "io.example.invalidQuery",
  l.params(),
  l.jsonPayload({
    message: l.string(),
  }),
);

const defaultedQuery = l.query(
  "io.example.defaultedQuery",
  l.params(),
  l.jsonPayload({
    message: l.string({ default: "hello default" }),
  }),
);

let server: xrpcServer.Server;
let httpServer: Deno.HttpServer;
let client: Client;
let baseUrl: string;

Deno.test.beforeAll(async () => {
  server = xrpcServer.createServer();

  server.add(echoQuery, {
    handler: ({ params }) => ({
      encoding: "application/json",
      body: { message: params.message },
    }),
  });

  server.add(passthroughExtraQuery, {
    handler: ({ params }) => {
      const extra = (params as Record<string, unknown>).extra;
      return {
        encoding: "application/json",
        body: {
          message: params.message,
          extra: typeof extra === "string" ? extra : undefined,
        },
      };
    },
  });

  server.add(echoProcedure, {
    handler: ({ input }) => ({
      encoding: "application/json",
      body: { message: input.body.message },
    }),
  });

  server.add(echoBinaryProcedure, {
    handler: ({ input }) => ({
      encoding: "application/octet-stream",
      body: input.body,
    }),
  });

  server.add(countSubscription, {
    handler: async function* ({ params }) {
      yield { count: params.count };
    },
  });

  server.add(
    typedCountSubscription,
    {
      handler: async function* ({ params }: { params: { count: number } }) {
        yield new MessageFrame({ count: params.count }, { type: "#odd" });
      },
    } as unknown as xrpcServer.LexSubscriptionConfig<
      typeof typedCountSubscription
    >,
  );

  server.add(defaultedQuery, {
    handler: () => ({
      encoding: "application/json",
      body: {} as unknown as { message: string },
    }),
  });

  httpServer = await createServer(server);
  const port = (httpServer as Deno.HttpServer & { port: number }).port;
  baseUrl = `http://localhost:${port}`;
  client = new Client(baseUrl);
});

Deno.test.afterAll(async () => {
  await closeServer(httpServer);
});

Deno.test("registers queries from lex sdk methods", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const response = await client.call(echoQuery, {
    params: { message: "hello query" },
  });

  assertEquals(response.data, { message: "hello query" });
});

Deno.test("preserves undeclared query params for lex sdk methods", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const response = await fetch(
    `${baseUrl}/xrpc/${passthroughExtraQuery.nsid}?message=hello&extra=world`,
  );

  assertEquals(await response.json(), {
    message: "hello",
    extra: "world",
  });
});

Deno.test("registers procedures from lex sdk methods", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const response = await client.call(echoProcedure, {
    body: { message: "hello procedure" },
  });

  assertEquals(response.data, { message: "hello procedure" });
});

Deno.test("registers binary procedures from lex sdk methods", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const bytes = new TextEncoder().encode("hello binary");
  const response = await client.call(echoBinaryProcedure, {
    body: bytes,
    encoding: "application/octet-stream",
  });

  assertEquals(response.data, bytes);
});

Deno.test("enforces blob limits for lex sdk binary procedures", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const limitingServer = xrpcServer.createServer(undefined, {
    payload: { blobLimit: 1 },
  });
  limitingServer.add(limitedBinaryProcedure, {
    handler: () => ({
      encoding: "application/json",
      body: { ok: true },
    }),
  });

  const limitingHttpServer = await createServer(limitingServer);

  try {
    const port = (limitingHttpServer as Deno.HttpServer & { port: number })
      .port;
    const limitingClient = new Client(`http://localhost:${port}`);

    await assertRejects(
      () =>
        limitingClient.call(limitedBinaryProcedure, {
          body: new Uint8Array([1, 2]),
          encoding: "application/octet-stream",
        }),
      XRPCError,
      "request entity too large",
    );
  } finally {
    await closeServer(limitingHttpServer);
  }
});

Deno.test("validates lex sdk responses by default", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const validatingServer = xrpcServer.createServer();
  validatingServer.add(invalidQuery, {
    handler: () => ({
      encoding: "application/json",
      body: { something: "else" } as unknown as { message: string },
    }),
  });

  const validatingHttpServer = await createServer(validatingServer);

  try {
    const port = (validatingHttpServer as Deno.HttpServer & { port: number })
      .port;
    const response = await fetch(
      `http://localhost:${port}/xrpc/${invalidQuery.nsid}`,
    );
    const payload = await response.json();

    assertEquals(response.status, 500);
    assertEquals(payload.error, "InternalServerError");
  } finally {
    await closeServer(validatingHttpServer);
  }
});

Deno.test("applies parsed lex sdk response bodies", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const response = await client.call(defaultedQuery);

  assertEquals(response.data, { message: "hello default" });
});

Deno.test("registers subscriptions from lex sdk methods", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const ws = new WebSocket(
    `${baseUrl.replace("http", "ws")}/xrpc/${countSubscription.nsid}?count=3`,
  );

  try {
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Connection failed"));
    });

    const frames = [];
    for await (const frame of byFrame(ws)) {
      frames.push(frame);
    }

    assertEquals(frames, [new MessageFrame({ count: 3 })]);
  } finally {
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.close();
    }
    await new Promise<void>((resolve) => {
      if (ws.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }
      const onClose = () => {
        ws.removeEventListener("close", onClose);
        resolve();
      };
      ws.addEventListener("close", onClose);
    });
  }
});

Deno.test("registers typed message frames from lex sdk subscriptions", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const ws = new WebSocket(
    `${
      baseUrl.replace("http", "ws")
    }/xrpc/${typedCountSubscription.nsid}?count=3`,
  );

  try {
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Connection failed"));
    });

    const frames = [];
    for await (const frame of byFrame(ws)) {
      frames.push(frame);
    }

    assertEquals(frames, [
      new MessageFrame({ count: 3 }, { type: "#odd" }),
    ]);
  } finally {
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.close();
    }
    await new Promise<void>((resolve) => {
      if (ws.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }
      const onClose = () => {
        ws.removeEventListener("close", onClose);
        resolve();
      };
      ws.addEventListener("close", onClose);
    });
  }
});
