import { l } from "@atp/lex";
import * as xrpcServer from "../mod.ts";
import { assertEquals, assertRejects } from "@std/assert";

type IsAny<T> = 0 extends (1 & T) ? true : false;
type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;

Deno.test("Server.add registers lex method handlers and exposes fetch/handlers", async () => {
  const server = new xrpcServer.Server();
  const method = l.query(
    "io.example.lexRouterApi",
    l.params({ value: l.string() }),
    l.jsonPayload({ value: l.string() }),
  );

  const returned = server.add(method, (ctx) => ({
    encoding: "application/json",
    body: { value: String(ctx.params.value) },
  }));

  assertEquals(returned, server);
  assertEquals(server.handlers.has(method.nsid), true);

  const response = await server.fetch(
    new Request("http://localhost/xrpc/io.example.lexRouterApi?value=hello"),
  );
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { value: "hello" });

  await assertRejects(
    async () => {
      server.add(method, () => ({
        encoding: "application/json",
        body: { value: "duplicate" },
      }));
    },
    TypeError,
    `Method ${method.nsid} already registered`,
  );
});

Deno.test("Server.add accepts namespace objects with main", async () => {
  const server = new xrpcServer.Server();
  const namespace = {
    main: l.query(
      "io.example.lexRouterNamespace",
      l.params({ value: l.string() }),
      l.jsonPayload({ value: l.string() }),
    ),
  };

  server.add(namespace, (ctx) => ({
    encoding: "application/json",
    body: { value: String(ctx.params.value) },
  }));

  const response = await server.fetch(
    new Request("http://localhost/xrpc/io.example.lexRouterNamespace?value=ok"),
  );
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { value: "ok" });
});

Deno.test("Server.add infers params type from lex methods", () => {
  const server = new xrpcServer.Server();
  const query = l.query(
    "io.example.paramsInference",
    l.params({ value: l.string() }),
    l.jsonPayload({ ok: l.boolean() }),
  );

  server.add(query, {
    handler: (ctx) => {
      type Value = typeof ctx.params.value;
      type _isNotAny = Assert<IsEqual<IsAny<Value>, false>>;
      const value: string = ctx.params.value;
      return {
        encoding: "application/json",
        body: { ok: value.length > 0 },
      };
    },
  });
});

Deno.test("Server supports LexRouter-style healthCheck and fallback options", async () => {
  const server = xrpcServer.createServer({
    healthCheck: async () => ({ status: "ok", service: "xrpc-server" }),
    fallback: async () => new Response("fallback", { status: 418 }),
  });

  const healthResponse = await server.fetch(
    new Request("http://localhost/xrpc/_health"),
  );
  assertEquals(healthResponse.status, 200);
  assertEquals(await healthResponse.json(), {
    status: "ok",
    service: "xrpc-server",
  });

  const fallbackResponse = await server.fetch(
    new Request("http://localhost/anything"),
  );
  assertEquals(fallbackResponse.status, 418);
  assertEquals(await fallbackResponse.text(), "fallback");
});

Deno.test("Server.add infers auth credentials type in handler", () => {
  const server = new xrpcServer.Server();
  const method = l.query(
    "io.example.authInference",
    l.params(),
    l.jsonPayload({ ok: l.boolean() }),
  );

  server.add(method, {
    auth: () => ({
      credentials: {
        userId: "u1",
      },
    }),
    handler: (ctx) => {
      const userId: string = ctx.auth.credentials.userId;
      return {
        encoding: "application/json",
        body: { ok: userId.length > 0 },
      };
    },
  });
});

Deno.test(
  "Server.add infers auth type from callable verifier methods",
  () => {
    const server = new xrpcServer.Server();

    type StandardOutput = {
      credentials: {
        type: "standard";
        aud: string;
        iss: string;
      };
      artifacts: unknown;
    };

    type RoleOutput = {
      credentials: {
        type: "role";
        admin: boolean;
      };
      artifacts: unknown;
    };

    interface ExtendedAuthVerifier {
      standardOrRole: (
        ctx: xrpcServer.MethodAuthContext,
      ) => Promise<StandardOutput | RoleOutput>;
    }

    interface AuthVerifier extends ExtendedAuthVerifier {
      (ctx: xrpcServer.MethodAuthContext): Promise<xrpcServer.AuthResult>;
    }

    const authVerifier = ((_: xrpcServer.MethodAuthContext) =>
      Promise.resolve({
        credentials: { type: "none" },
      })) as AuthVerifier;

    authVerifier.standardOrRole = async () => ({
      credentials: { type: "role", admin: true },
      artifacts: null,
    });

    const query = l.query(
      "io.example.authInferenceCallable",
      l.params(),
      l.jsonPayload({ ok: l.boolean() }),
    );

    server.add(query, {
      auth: authVerifier.standardOrRole,
      handler: (ctx) => {
        type InferredAuth = typeof ctx.auth;
        type _isNotAny = Assert<IsEqual<IsAny<InferredAuth>, false>>;
        type _isCorrect = Assert<
          IsEqual<InferredAuth, StandardOutput | RoleOutput>
        >;
        const variant = ctx.auth.credentials.type;
        if (variant === "role") {
          const admin: boolean = ctx.auth.credentials.admin;
          return {
            encoding: "application/json",
            body: { ok: admin },
          };
        }
        const aud: string = ctx.auth.credentials.aud;
        return {
          encoding: "application/json",
          body: { ok: aud.length > 0 },
        };
      },
    });
  },
);
