import { type ServerOptions, type WebSocket, WebSocketServer } from "ws";
import { ErrorFrame, type Frame } from "./frames.ts";
import { logger } from "../logger.ts";
import { CloseCode, DisconnectError } from "./types.ts";

/**
 * XRPC WebSocket streaming server implementation.
 * Handles WebSocket connections and message streaming for XRPC methods.
 * @class
 */
export class XrpcStreamServer {
  wss: WebSocketServer;

  constructor(opts: ServerOptions & { handler: Handler }) {
    const { handler, ...serverOpts } = opts;
    this.wss = new WebSocketServer(serverOpts);
    this.wss.on(
      "connection",
      async (socket: WebSocket, req: Request) => {
        socket.onerror = (ev: Event | ErrorEvent) => {
          if (ev instanceof ErrorEvent) {
            logger.error("websocket error", { error: ev.error });
          } else {
            logger.error("websocket error", { ev });
          }
        };
        try {
          const ac = new AbortController();
          const iterator = unwrapIterator(
            handler(req, ac.signal, socket, this),
          );
          socket.onclose = () => {
            iterator.return?.();
            ac.abort();
          };
          const safeFrames = wrapIterator(iterator);
          for await (const frame of safeFrames) {
            // Send the frame first
            await new Promise<void>((res, rej) => {
              try {
                socket.send((frame as Frame).toBytes());
                res();
              } catch (err) {
                rej(err);
              }
            });

            // Check for ErrorFrame after sending and immediately terminate
            if (frame instanceof ErrorFrame) {
              // Immediately stop the iterator and abort to prevent further frames
              try {
                iterator.return?.();
              } catch {
                // Ignore errors from iterator.return
              }
              ac.abort();
              throw new DisconnectError(CloseCode.Policy, frame.body.error);
            }
          }
        } catch (err) {
          if (err instanceof DisconnectError) {
            return socket.close(err.wsCode, err.xrpcCode);
          } else {
            logger.error("websocket server error", { err });
            return socket.close(CloseCode.Abnormal);
          }
        }
        socket.close(CloseCode.Normal);
      },
    );
  }
}

/**
 * Handler function type for WebSocket connections.
 * @callback Handler
 * @param req - The incoming WebSocket request
 * @param signal - Signal for detecting connection abort
 * @param socket - The WebSocket connection
 * @param server - The server instance
 * @returns An async iterable of frames to send
 */
export type Handler = (
  req: Request,
  signal: AbortSignal,
  socket: WebSocket,
  server: XrpcStreamServer,
) => AsyncIterable<Frame>;

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
