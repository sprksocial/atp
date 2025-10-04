// Runtime-agnostic WebSocket stream sender for XRPC frames.
// Works with standard WebSocket objects (Deno, Workers, Bun, Browser).

import { ErrorFrame, type Frame } from "./frames.ts";
import { logger } from "../logger.ts";
import { CloseCode, DisconnectError } from "./types.ts";

/**
 * Handler function type for WebSocket connections.
 * @param req    - The incoming HTTP Upgrade Request (standard Fetch API Request)
 * @param signal - AbortSignal that is aborted when the socket closes or server stops this session
 * @param socket - The upgraded WebSocket (standard WebSocket)
 * @param server - The XrpcStreamServer instance (for optional broadcast/future features)
 * @returns      - An async iterable of Frames to send over the socket
 */
export type Handler = (
  req: Request,
  signal: AbortSignal,
  socket: WebSocket,
  server: XrpcStreamServer,
) => AsyncIterable<Frame>;

/**
 * Web-standards replacement for the old ws.WebSocketServer-based class.
 * - You construct it with a `handler`.
 * - Call `handle(req, socket)` for each upgraded WebSocket connection from Hono.
 * - Includes minimal connection tracking & broadcast helper (optional).
 */
export class XrpcStreamServer {
  private readonly handler: Handler;
  private readonly sockets = new Set<WebSocket>();

  constructor(opts: { handler: Handler }) {
    this.handler = opts.handler;
  }

  /** Handle a single upgraded WebSocket connection. */
  handle(req: Request, socket: WebSocket) {
    // Cloudflare Workers note: ensure you've called `server.accept()` on the server-side socket before calling handle().
    this.sockets.add(socket);

    socket.addEventListener("error", (ev: Event) => {
      const e = (ev as ErrorEvent)?.error ?? ev;
      logger.error("websocket error", { error: e });
    });

    (async () => {
      const ac = new AbortController();

      // If the peer closes, stop the handler iterator and abort the session.
      socket.addEventListener(
        "close",
        () => {
          try {
            // Best-effort: if the iterator supports return(), notify it.
            iterator.return?.();
          } catch {
            // ignore
          }
          ac.abort();
          this.sockets.delete(socket);
        },
        { once: true },
      );

      const iterator = unwrapIterator(
        this.handler(req, ac.signal, socket, this),
      );
      const safeFrames = wrapIterator(iterator);

      try {
        for await (const frame of safeFrames) {
          // Send the frame bytes. Standard WebSocket#send is synchronous; wrap to normalize throws.
          sendBytes(socket, (frame as Frame).toBytes());

          // If the frame represents a protocol error, terminate immediately after sending it.
          if (frame instanceof ErrorFrame) {
            try {
              iterator.return?.();
            } catch {
              // ignore
            }
            ac.abort();
            throw new DisconnectError(CloseCode.Policy, frame.body.error);
          }
        }
      } catch (err) {
        if (err instanceof DisconnectError) {
          socket.close(err.wsCode, String(err.xrpcCode ?? ""));
          return;
        } else {
          logger.error("websocket server error", { err });
          socket.close(CloseCode.Abnormal, "server error");
          return;
        }
      }

      // Clean close after iterator completes
      socket.close(CloseCode.Normal, "done");
    })().catch((err) => {
      // Top-level safety net; log and try to close.
      logger.error("websocket handler failure", { err });
      socket.close(CloseCode.Abnormal, "handler failure");
    });
  }

  /** Optional helper: broadcast raw bytes to all open sockets. */
  broadcast(bytes: Uint8Array) {
    for (const s of this.sockets) {
      if (s.readyState === WebSocket.OPEN) {
        s.send(bytes);
      }
    }
  }
}

/** Utilities mirroring your original helpers */
function unwrapIterator<T>(iterable: AsyncIterable<T>): AsyncIterator<T> {
  return iterable[Symbol.asyncIterator]();
}
function wrapIterator<T>(iterator: AsyncIterator<T>): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      return iterator;
    },
  };
}

/** Synchronous send with consistent error surfacing. */
function sendBytes(ws: WebSocket, bytes: Uint8Array) {
  if (ws.readyState !== WebSocket.OPEN) {
    throw new DisconnectError(CloseCode.Abnormal, "socket-not-open");
  }
  // Standard WebSocket#send may throw (e.g., if closed mid-call)
  ws.send(bytes);
}
