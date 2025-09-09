import { type ServerOptions, WebSocketServer } from "ws";
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

  /**
   * Creates a new XRPC streaming server instance.
   * @constructor
   * @param {Object} opts - Server configuration options
   * @param {Handler} opts.handler - Function to handle incoming WebSocket connections
   * @param {ServerOptions} opts - Additional WebSocket server options
   */
  constructor(opts: ServerOptions & { handler: Handler }) {
    const { handler, ...serverOpts } = opts;
    this.wss = new WebSocketServer(serverOpts);
    this.wss.on(
      "connection",
      async (socket: WebSocket, req: Request) => {
        socket.onerror = (ev: Event | ErrorEvent) => {
          if (ev instanceof ErrorEvent) {
            logger.error(ev.error, "websocket error");
          } else {
            logger.error(ev, "websocket error");
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
            await new Promise<void>((res, rej) => {
              try {
                socket.send((frame as Frame).toBytes());
                res();
              } catch (err) {
                rej(err);
              }
            });
            if (frame instanceof ErrorFrame) {
              throw new DisconnectError(CloseCode.Policy, frame.body.error);
            }
          }
        } catch (err) {
          if (err instanceof DisconnectError) {
            return socket.close(err.wsCode, err.xrpcCode);
          } else {
            logger.error({ err }, "websocket server error");
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
 * @param {Request} req - The incoming WebSocket request
 * @param {AbortSignal} signal - Signal for detecting connection abort
 * @param {WebSocket} socket - The WebSocket connection
 * @param {XrpcStreamServer} server - The server instance
 * @returns {AsyncIterable<Frame>} An async iterable of frames to send
 */
export type Handler = (
  req: Request,
  signal: AbortSignal,
  socket: WebSocket,
  server: XrpcStreamServer,
) => AsyncIterable<Frame>;

/**
 * Unwraps an AsyncIterable into its AsyncIterator.
 * @template T - The type of values being iterated
 * @param {AsyncIterable<T>} iterable - The iterable to unwrap
 * @returns {AsyncIterator<T>} The unwrapped iterator
 */
function unwrapIterator<T>(iterable: AsyncIterable<T>): AsyncIterator<T> {
  return iterable[Symbol.asyncIterator]();
}

/**
 * Wraps an AsyncIterator back into an AsyncIterable.
 * @template T - The type of values being iterated
 * @param {AsyncIterator<T>} iterator - The iterator to wrap
 * @returns {AsyncIterable<T>} The wrapped iterable
 */
function wrapIterator<T>(iterator: AsyncIterator<T>): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      return iterator;
    },
  };
}
