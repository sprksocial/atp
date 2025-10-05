// streaming-adapters.ts
// Put all three runtime-specific Hono adapters in one file.
// Call exactly one of these from your router's 'mount' callback.

import type { Hono } from "hono";

// ---- minimal contract your mux needs to expose ----
export interface XrpcMux {
  // Should return a subscription server with `.handle(req, socket)` or undefined.
  resolveForRequest(req: Request):
    | { handle(req: Request, socket: WebSocket): void }
    | undefined;
}

// Optional tuning knobs
export interface AdapterOptions {
  /** Route path to mount; defaults to "/xrpc/*" */
  path?: string;
  /** Hook for logging socket-level errors */
  onError?: (e: unknown) => void;
  /** Override close codes; defaults use standard WS codes */
  closeCodes?: { Policy?: number; Abnormal?: number; Normal?: number };
}

export const DEFAULT_PATH = "/xrpc/*";
export const DEFAULT_CODES = { Policy: 1008, Abnormal: 1006, Normal: 1000 };

export function safeClose(ws: WebSocket, code: number, reason?: string) {
  try {
    ws.close(code, reason);
  } catch {
    /* ignore */
  }
}

// ---------- DENO ----------
import { upgradeWebSocket as upgradeWebSocketDeno } from "hono/deno";

/** Mounts a streaming route using Hono's Deno helper. */
export function mountStreamingRoutesDeno(
  app: Hono,
  mux: XrpcMux,
  opts: AdapterOptions = {},
) {
  const path = opts.path ?? DEFAULT_PATH;
  const codes = { ...DEFAULT_CODES, ...(opts.closeCodes ?? {}) };

  app.get(
    path,
    upgradeWebSocketDeno((c) => {
      const sub = mux.resolveForRequest(c.req.raw);
      if (!sub) {
        return {
          onOpen(_e, ws) {
            if (!ws.raw) return;
            safeClose(ws.raw, codes.Policy, "unknown subscription");
          },
          onError: (e) => opts.onError?.(e),
        };
      }
      return {
        onOpen(_e, ws) {
          if (!ws.raw) return;
          sub.handle(c.req.raw, ws.raw);
        },
        onError: (e) => opts.onError?.(e),
      };
    }),
  );
}

// ---------- CLOUDFlARE WORKERS ----------
/**
 * Mounts a streaming route on Workers. We do a manual upgrade with WebSocketPair
 * so streaming can start immediately (no need to wait for a kick message).
 */
export function mountStreamingRoutesWorkers(
  app: Hono,
  mux: XrpcMux,
  opts: AdapterOptions = {},
) {
  const path = opts.path ?? DEFAULT_PATH;

  app.get(path, (c) => {
    const sub = mux.resolveForRequest(c.req.raw);
    if (!sub) {
      return new Response("unknown subscription", { status: 404 });
    }

    // @ts-expect-error worker-specific api
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Workers requires accept() before use
    (server as { accept: () => void }).accept?.();

    try {
      sub.handle(c.req.raw, server as WebSocket);
      // @ts-expect-error worker-specific version of Response
      return new Response(null, { status: 101, webSocket: client });
    } catch (e) {
      opts.onError?.(e);
      safeClose(server as WebSocket, DEFAULT_CODES.Abnormal, "server error");
      return new Response("upgrade failed", { status: 500 });
    }
  });
}
