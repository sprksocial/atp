import { MINUTE } from "@atp/common";
import type { LexiconDoc } from "@atproto/lexicon";
import { XrpcClient } from "@atp/xrpc";
import * as xrpcServer from "../mod.ts";
import { closeServer, createServer } from "./_util.ts";
import { assertRejects } from "@std/assert";

const LEXICONS: LexiconDoc[] = [
  {
    lexicon: 1,
    id: "io.example.routeLimit",
    defs: {
      main: {
        type: "query",
        parameters: {
          type: "params",
          required: ["str"],
          properties: {
            str: { type: "string" },
          },
        },
        output: {
          encoding: "application/json",
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.routeLimitReset",
    defs: {
      main: {
        type: "query",
        parameters: {
          type: "params",
          required: ["count"],
          properties: {
            count: { type: "integer" },
          },
        },
        output: {
          encoding: "application/json",
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.sharedLimitOne",
    defs: {
      main: {
        type: "query",
        parameters: {
          type: "params",
          required: ["points"],
          properties: {
            points: { type: "integer" },
          },
        },
        output: {
          encoding: "application/json",
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.sharedLimitTwo",
    defs: {
      main: {
        type: "query",
        parameters: {
          type: "params",
          required: ["points"],
          properties: {
            points: { type: "integer" },
          },
        },
        output: {
          encoding: "application/json",
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.toggleLimit",
    defs: {
      main: {
        type: "query",
        parameters: {
          type: "params",
          properties: {
            shouldCount: { type: "boolean" },
          },
        },
        output: {
          encoding: "application/json",
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.noLimit",
    defs: {
      main: {
        type: "query",
        output: {
          encoding: "application/json",
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.nonExistent",
    defs: {
      main: {
        type: "query",
        output: {
          encoding: "application/json",
        },
      },
    },
  },
];

async function setupServer(testName: string = "test") {
  // Generate unique key prefix for this test instance with process ID for better isolation
  const keyPrefix = `${testName}-${Deno.pid}-${Date.now()}-${
    Math.random().toString(36).substr(2, 9)
  }`;

  const server = xrpcServer.createServer(LEXICONS, {
    rateLimits: {
      creator: (opts) =>
        new xrpcServer.MemoryRateLimiter({
          ...opts,
          keyPrefix: `${keyPrefix}-${opts.keyPrefix}`,
        }),
      bypass: (ctx) => ctx.req.headers.get("x-ratelimit-bypass") === "bypass",
      shared: [
        {
          name: `${keyPrefix}-shared-limit`,
          durationMs: 5 * MINUTE,
          points: 6,
        },
      ],
      global: [
        {
          name: `${keyPrefix}-global-ip`,
          durationMs: 5 * MINUTE,
          points: 100,
        },
      ],
    },
  });

  server.method("io.example.routeLimit", {
    rateLimit: {
      durationMs: 5 * MINUTE,
      points: 5,
      calcKey: (ctx) => (ctx as xrpcServer.HandlerContext).params.str as string,
    },
    handler: (ctx: xrpcServer.HandlerContext) => ({
      encoding: "application/json",
      body: ctx.params,
    }),
  });

  server.method("io.example.routeLimitReset", {
    rateLimit: {
      durationMs: 5 * MINUTE,
      points: 2,
    },
    handler: (ctx: xrpcServer.HandlerContext) => {
      if (ctx.params.count === 1) {
        ctx.resetRouteRateLimits();
      }

      return {
        encoding: "application/json",
        body: {},
      };
    },
  });

  server.method("io.example.sharedLimitOne", {
    rateLimit: {
      name: `${keyPrefix}-shared-limit`,
      calcPoints: (ctx) =>
        (ctx as xrpcServer.HandlerContext).params.points as number,
    },
    handler: (ctx: xrpcServer.HandlerContext) => ({
      encoding: "application/json",
      body: ctx.params,
    }),
  });

  server.method("io.example.sharedLimitTwo", {
    rateLimit: {
      name: `${keyPrefix}-shared-limit`,
      calcPoints: (ctx) =>
        (ctx as xrpcServer.HandlerContext).params.points as number,
    },
    handler: (ctx: xrpcServer.HandlerContext) => ({
      encoding: "application/json",
      body: ctx.params,
    }),
  });

  server.method("io.example.toggleLimit", {
    rateLimit: [
      {
        durationMs: 5 * MINUTE,
        points: 5,
        calcPoints: (
          ctx,
        ) => ((ctx as xrpcServer.HandlerContext).params.shouldCount ? 1 : 0),
      },
      {
        durationMs: 5 * MINUTE,
        points: 10,
      },
    ],
    handler: (ctx: xrpcServer.HandlerContext) => ({
      encoding: "application/json",
      body: ctx.params,
    }),
  });

  server.method("io.example.noLimit", {
    handler: () => ({
      encoding: "application/json",
      body: {},
    }),
  });

  const s = await createServer(server);
  const port = (s as Deno.HttpServer & { port: number }).port;
  const client = new XrpcClient(`http://localhost:${port}`, LEXICONS);

  return { server: s, client };
}

Deno.test({
  name: "rate limits a given route",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { server, client } = await setupServer("route-limit");
    try {
      const makeCall = () =>
        client.call("io.example.routeLimit", { str: "test" });
      for (let i = 0; i < 5; i++) {
        await makeCall();
      }
      await assertRejects(
        () => makeCall(),
        Error,
        "Rate Limit Exceeded",
      );
    } finally {
      await closeServer(server);
      // Add delay to ensure rate limit windows expire
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  },
});

Deno.test({
  name: "can reset route rate limits",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { server, client } = await setupServer("route-reset");
    try {
      // Limit is 2.
      // Call 0 is OK (1/2).
      // Call 1 is OK (2/2), and resets the limit.
      // Call 2 is OK (1/2).
      // Call 3 is OK (2/2).
      for (let i = 0; i < 4; i++) {
        await client.call("io.example.routeLimitReset", { count: i });
      }

      // Call 4 exceeds the limit (3/2).
      await assertRejects(
        () => client.call("io.example.routeLimitReset", { count: 4 }),
        Error,
        "Rate Limit Exceeded",
      );
    } finally {
      await closeServer(server);
      // Add delay to ensure rate limit windows expire
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  },
});

Deno.test({
  name: "rate limits on a shared route",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { server, client } = await setupServer("shared-route");
    try {
      await client.call("io.example.sharedLimitOne", { points: 1 });
      await client.call("io.example.sharedLimitTwo", { points: 1 });
      await client.call("io.example.sharedLimitOne", { points: 2 });
      await client.call("io.example.sharedLimitTwo", { points: 2 });
      await assertRejects(
        () => client.call("io.example.sharedLimitOne", { points: 1 }),
        Error,
        "Rate Limit Exceeded",
      );
      await assertRejects(
        () => client.call("io.example.sharedLimitTwo", { points: 1 }),
        Error,
        "Rate Limit Exceeded",
      );
    } finally {
      await closeServer(server);
      // Add delay to ensure rate limit windows expire
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  },
});

Deno.test({
  name: "applies multiple rate-limits",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { server, client } = await setupServer("multi-limit");
    try {
      const makeCall = (shouldCount: boolean) =>
        client.call("io.example.toggleLimit", { shouldCount });
      for (let i = 0; i < 5; i++) {
        await makeCall(true);
      }
      await assertRejects(
        () => makeCall(true),
        Error,
        "Rate Limit Exceeded",
      );
      for (let i = 0; i < 4; i++) {
        await makeCall(false);
      }
      await assertRejects(
        () => makeCall(false),
        Error,
        "Rate Limit Exceeded",
      );
    } finally {
      await closeServer(server);
      // Add delay to ensure rate limit windows expire
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  },
});

Deno.test({
  name: "applies global limits",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { server, client } = await setupServer("global-limit");
    try {
      const makeCall = () => client.call("io.example.noLimit");
      const calls: Promise<unknown>[] = [];
      for (let i = 0; i < 110; i++) {
        calls.push(makeCall());
      }
      await assertRejects(
        () => Promise.all(calls),
        Error,
        "Rate Limit Exceeded",
      );
    } finally {
      await closeServer(server);
      // Add delay to ensure rate limit windows expire
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  },
});

Deno.test({
  name: "applies global limits to xrpc catchall",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { server, client } = await setupServer("catchall-limit");
    try {
      const makeCall = () => client.call("io.example.nonExistent");
      await assertRejects(
        () => makeCall(),
        Error,
        "XRPCNotSupported",
      );
    } finally {
      await closeServer(server);
      // Add delay to ensure rate limit windows expire
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  },
});

Deno.test({
  name: "can bypass rate limits",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { server, client } = await setupServer("bypass-limit");
    try {
      const makeCall = () =>
        client.call(
          "io.example.noLimit",
          {},
          {},
          { headers: { "x-ratelimit-bypass": "bypass" } },
        );
      const calls: Promise<unknown>[] = [];
      for (let i = 0; i < 110; i++) {
        calls.push(makeCall());
      }

      await Promise.all(calls);
    } finally {
      await closeServer(server);
      // Add delay to ensure rate limit windows expire
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  },
});
