import type * as xrpc from "../mod.ts";
import { AuthRequiredError } from "../errors.ts";

export async function createServer(
  server: xrpc.Server,
): Promise<Deno.HttpServer> {
  const abortController = new AbortController();
  let resolveServer: (value: number) => void;
  const portPromise = new Promise<number>((resolve) => {
    resolveServer = resolve;
  });

  const httpServer = Deno.serve({
    signal: abortController.signal,
    port: 0,
    onListen({ port }) {
      resolveServer(port);
    },
    handler: server.handler.fetch,
  });

  // Attach the abort controller and port for cleanup and access
  type ServerWithMetadata = Deno.HttpServer & {
    abortController: AbortController;
    port: number;
  };

  (httpServer as ServerWithMetadata).abortController = abortController;
  const port = await portPromise;
  (httpServer as ServerWithMetadata).port = port;

  return httpServer;
}

export async function closeServer(httpServer: Deno.HttpServer) {
  type ServerWithAbortController = Deno.HttpServer & {
    abortController: AbortController;
  };
  const abortController =
    (httpServer as ServerWithAbortController).abortController;
  if (abortController) {
    abortController.abort();
    await httpServer.finished;
  }
}

export function createBasicAuth(allowed: {
  username: string;
  password: string;
}) {
  const verifyAuth = (header?: string | null) => {
    if (!header || !header.startsWith("Basic ")) {
      throw new AuthRequiredError();
    }
    const original = header.replace("Basic ", "");
    const decoded = atob(original);
    const [username, password] = decoded.split(":");
    if (username !== allowed.username || password !== allowed.password) {
      throw new AuthRequiredError();
    }
    return {
      credentials: { username },
      artifacts: { original },
    };
  };

  return function (ctx: {
    params: xrpc.Params;
    input: xrpc.Input;
    req: Request;
    res: Response;
  }) {
    return verifyAuth(ctx.req.headers.get("authorization"));
  };
}

export function createStreamBasicAuth(
  { username, password }: { username: string; password: string },
) {
  return (ctx: { req: { headers: Headers } }) => {
    const auth = ctx.req.headers.get("authorization");
    if (auth !== `Basic ${btoa(`${username}:${password}`)}`) {
      throw new AuthRequiredError();
    }
    return {
      credentials: { username },
      artifacts: { original: btoa(`${username}:${password}`) },
    };
  };
}

export function basicAuthHeaders(creds: {
  username: string;
  password: string;
}) {
  return {
    authorization: "Basic " +
      btoa(`${creds.username}:${creds.password}`),
  };
}
