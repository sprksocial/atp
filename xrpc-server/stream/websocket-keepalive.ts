// websocket-keepalive.ts
// Runtime-agnostic (Deno / Workers / Bun / Browser)

import { SECOND, wait } from "@atp/common";
import { CloseCode, DisconnectError } from "./types.ts";
import { iterateBinary } from "./stream.ts";

/**
 * Options for a {@link WebSocketKeepAlive} instance
 *
 * @prop getUrl Method to get the current URL of the websocket endpoint
 * @prop maxReconnectSeconds Maximum time a request can take to reconnect
 * @prop signal Abort signal to send when aborting connection
 *
 * @prop heartbeatIntervalMs Interval to send provided heartbeatPayload on,
 * @prop heartbeatPayload Method to create payload to send for heartbeat
 * @prop isPong If provided, we mark alive only when it returns true for a message
 *   if omitted, *any* message is considered proof of life
 *
 * @prop onReconnectError Reconnect hook
 *
 * @prop createSocket Socket factory override (lets you use custom client if needed)
 * @prop protocols Override value for accepted protocols
 */
export type KeepAliveOptions = {
  getUrl: () => Promise<string>;
  maxReconnectSeconds?: number;
  signal?: AbortSignal;

  heartbeatIntervalMs?: number; // default 10 * SECOND
  heartbeatPayload?: () => string | ArrayBuffer | Uint8Array | Blob;
  isPong?: (data: unknown) => boolean;

  // Reconnect hook
  onReconnectError?: (error: unknown, n: number, initialSetup: boolean) => void;

  createSocket?: (url: string, protocols?: string | string[]) => WebSocket;
  protocols?: string | string[];
};

export class WebSocketKeepAlive {
  public ws: WebSocket | null = null;
  public initialSetup = true;
  public reconnects: number | null = null;

  /**
   * Creates a new WebSocketKeepAlive instance.
   * @param opts Configuration options for keepalive, heartbeat, reconnect, and socket creation.
   */
  constructor(public opts: KeepAliveOptions) {}

  async *[Symbol.asyncIterator](): AsyncGenerator<Uint8Array> {
    const maxReconnectMs = 1000 * (this.opts.maxReconnectSeconds ?? 64);

    while (true) {
      if (this.reconnects !== null) {
        const duration = this.initialSetup
          ? Math.min(1000, maxReconnectMs)
          : backoffMs(this.reconnects++, maxReconnectMs);
        await wait(duration);
      }

      const url = await this.opts.getUrl();

      // Create a web-standard WebSocket (or a custom one if provided).
      const ws = this.opts.createSocket?.(url, this.opts.protocols) ??
        new WebSocket(url, this.opts.protocols);
      this.ws = ws;

      const ac = new AbortController();
      if (this.opts.signal) {
        forwardSignal(this.opts.signal, ac);
      }

      // Track liveness (application-level heartbeat)
      this.startHeartbeat(ws, ac);

      // When the socket opens, reset backoff.
      ws.addEventListener(
        "open",
        () => {
          this.initialSetup = false;
          this.reconnects = 0;
        },
        { once: true },
      );

      // Distinguish abnormal close → treat as reconnectable error
      ws.addEventListener(
        "close",
        (ev) => {
          if (ev.code === CloseCode.Abnormal) {
            ac.abort(
              new AbnormalCloseError(
                `Abnormal ws close: ${String(ev.reason || "")}`,
              ),
            );
          }
        },
        { once: true },
      );

      try {
        // Iterate incoming binary chunks
        for await (const chunk of iterateBinary(ws)) {
          yield chunk;
        }
      } catch (error) {
        // Normalize Abort into same shape your old code expected.
        const err = (error as Error)?.name === "AbortError"
          ? (error as Error).cause ?? error
          : error;

        if (err instanceof DisconnectError) {
          // We cleanly end the connection
          ws?.close(err.wsCode);
          break;
        }

        // Close if not already closing
        ws.close();

        if (isReconnectable(err)) {
          this.reconnects ??= 0; // Never reconnect when null
          this.opts.onReconnectError?.(err, this.reconnects, this.initialSetup);
          continue; // loop to reconnect
        } else {
          throw err;
        }
      }

      // Other side ended stream cleanly; stop iterating.
      break;
    }
  }

  /** Application-level heartbeat (web standard).
   *
   * In Node's `ws` you used `ping`/`pong`. Those do not exist in web sockets.
   * Here we:
   *  - periodically send `heartbeatPayload()` if provided
   *  - consider the connection "alive" when:
   *      * `isPong(ev.data)` returns true (if provided), OR
   *      * *any* message is received (fallback)
   *  - if no proof of life for one interval, we close the socket (which triggers reconnect)
   */
  private startHeartbeat(ws: WebSocket, ac: AbortController) {
    const intervalMs = this.opts.heartbeatIntervalMs ?? 10 * SECOND;

    let isAlive = true;
    let timer: number | null = null;

    const onMessage = (ev: MessageEvent) => {
      // If a custom pong detector exists, use it; otherwise any message counts.
      if (!this.opts.isPong || this.opts.isPong(ev.data)) {
        isAlive = true;
      }
    };

    const tick = () => {
      if (!isAlive) {
        // No pong/traffic since last tick → consider dead and close.
        ws.close(1000);
        // Abort the iterator with a recognizable shape like before.
        const domErr = new DOMException("Aborted", "AbortError");
        domErr.cause = new DisconnectError(
          CloseCode.Abnormal,
          "HeartbeatTimeout",
        );
        ac.abort(domErr);
        return;
      }
      isAlive = false;

      const payload = this.opts.heartbeatPayload?.();
      if (payload !== undefined) {
        ws.send(payload);
      }
    };

    // Prime one cycle and schedule subsequent ones
    tick();
    timer = setInterval(tick, intervalMs) as unknown as number;

    ws.addEventListener("message", onMessage);
    ws.addEventListener(
      "close",
      () => {
        if (timer !== null) {
          clearInterval(timer);
          timer = null;
        }
        ws.removeEventListener("message", onMessage);
      },
      { once: true },
    );
  }
}

export default WebSocketKeepAlive;

class AbnormalCloseError extends Error {
  code = "EWSABNORMALCLOSE";
}

function isReconnectable(err: unknown): boolean {
  // Network-ish errors are reconnectable. Keep your previous codes.
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: unknown; code?: unknown };
  if (typeof e.name !== "string") return false;
  return typeof e.code === "string" && networkErrorCodes.includes(e.code);
}

const networkErrorCodes = [
  "EWSABNORMALCLOSE",
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "EPIPE",
  "ETIMEDOUT",
  "ECANCELED",
  "ABORT_ERR", // surface our aborts as reconnectable if you want
];

function backoffMs(n: number, maxMs: number) {
  const baseSec = Math.pow(2, n); // 1, 2, 4, ...
  const randSec = Math.random() - 0.5; // jitter [-0.5, +0.5]
  const ms = 1000 * (baseSec + randSec);
  return Math.min(ms, maxMs);
}

function forwardSignal(signal: AbortSignal, ac: AbortController) {
  if (signal.aborted) {
    return ac.abort(signal.reason);
  }
  const onAbort = () => ac.abort(signal.reason);
  // Use AbortSignal.any? Not universally available; just add/remove.
  signal.addEventListener("abort", onAbort, { signal: ac.signal });
}