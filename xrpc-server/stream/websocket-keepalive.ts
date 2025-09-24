import { SECOND, wait } from "@atp/common";
import { CloseCode, DisconnectError, type WebSocketOptions } from "./types.ts";

/**
 * WebSocket client with automatic reconnection and heartbeat functionality.
 * Handles connection management, reconnection backoff, and keep-alive messages.
 * @class
 */
export class WebSocketKeepAlive {
  public ws: WebSocket | null = null;
  public initialSetup = true;
  public reconnects: number | null = null;

  constructor(
    public opts: WebSocketOptions & {
      getUrl: () => Promise<string>;
      maxReconnectSeconds?: number;
      signal?: AbortSignal;
      heartbeatIntervalMs?: number;
      onReconnectError?: (
        error: unknown,
        n: number,
        initialSetup: boolean,
      ) => void;
    },
  ) {}

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
      this.ws = new WebSocket(url, this.opts.protocols);
      const ac = new AbortController();
      if (this.opts.signal) {
        forwardSignal(this.opts.signal, ac);
      }
      this.ws.onopen = () => {
        this.initialSetup = false;
        this.reconnects = 0;
        if (this.ws) {
          this.startHeartbeat(this.ws);
        }
      };
      this.ws.onclose = (ev: CloseEvent) => {
        if (ev.code === CloseCode.Abnormal) {
          // Forward into an error to distinguish from a clean close
          ac.abort(
            new AbnormalCloseError(`Abnormal ws close: ${ev.reason}`),
          );
        }
      };

      try {
        const messageQueue: Uint8Array[] = [];
        let error: Error | null = null;
        let finished = false;
        let resolveNext: (() => void) | null = null;

        const processMessage = (ev: MessageEvent) => {
          if (ev.data === "pong") {
            // Handle heartbeat pong responses separately
            return;
          }
          if (ev.data instanceof Uint8Array) {
            messageQueue.push(ev.data);
            if (resolveNext) {
              resolveNext();
              resolveNext = null;
            }
          }
        };

        const handleError = (ev: Event | ErrorEvent) => {
          error = ev instanceof ErrorEvent && ev.error
            ? ev.error
            : new Error("WebSocket error");
          if (resolveNext) {
            resolveNext();
            resolveNext = null;
          }
        };

        const handleClose = () => {
          finished = true;
          if (resolveNext) {
            resolveNext();
            resolveNext = null;
          }
        };

        this.ws.onmessage = processMessage;
        this.ws.onerror = handleError;
        this.ws.onclose = handleClose;

        // Wait for connection if still connecting
        if (this.ws.readyState === WebSocket.CONNECTING) {
          await new Promise<void>((resolve, reject) => {
            const onOpen = () => {
              this.ws!.removeEventListener("open", onOpen);
              this.ws!.removeEventListener("error", onInitialError);
              resolve();
            };

            const onInitialError = (ev: Event | ErrorEvent) => {
              this.ws!.removeEventListener("open", onOpen);
              this.ws!.removeEventListener("error", onInitialError);
              const errorMsg = ev instanceof ErrorEvent && ev.error
                ? ev.error
                : new Error("Failed to connect to WebSocket");
              reject(errorMsg);
            };

            this.ws!.addEventListener("open", onOpen, { once: true });
            this.ws!.addEventListener("error", onInitialError, { once: true });
          });
        }

        // Main message processing loop
        while (!finished && !error && !ac.signal.aborted) {
          // Process any queued messages first
          while (messageQueue.length > 0) {
            yield messageQueue.shift()!;
          }

          // If no messages and not finished, wait for next event
          if (
            !finished && !error && !ac.signal.aborted &&
            messageQueue.length === 0
          ) {
            await new Promise<void>((resolve) => {
              resolveNext = resolve;
              // Also resolve if abort signal is triggered
              if (ac.signal.aborted) {
                resolve();
              } else {
                ac.signal.addEventListener("abort", () => resolve(), {
                  once: true,
                });
              }
            });
          }
        }

        // Process any remaining messages
        while (messageQueue.length > 0) {
          yield messageQueue.shift()!;
        }

        if (error) throw error;
        if (ac.signal.aborted) throw ac.signal.reason;
      } catch (_err) {
        const err = isErrorWithCode(_err) && _err.code === "ABORT_ERR"
          ? _err.cause
          : _err;
        if (err instanceof DisconnectError) {
          // We cleanly end the connection
          this.ws?.close(err.wsCode);
          break;
        }
        this.ws?.close(); // No-ops if already closed or closing
        if (isReconnectable(err)) {
          this.reconnects ??= 0; // Never reconnect with a null
          this.opts.onReconnectError?.(err, this.reconnects, this.initialSetup);
          continue;
        } else {
          throw err;
        }
      }
      break; // Other side cleanly ended stream and disconnected
    }
  }

  startHeartbeat(ws: WebSocket) {
    let isAlive = true;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    const checkAlive = () => {
      if (!isAlive) {
        return ws.close();
      }
      isAlive = false; // expect websocket to no longer be alive unless we receive a "pong" within the interval
      ws.send("ping");
    };

    // Store original handlers to chain them properly
    const originalOnMessage = ws.onmessage;
    const originalOnClose = ws.onclose;

    checkAlive();
    heartbeatInterval = setInterval(
      checkAlive,
      this.opts.heartbeatIntervalMs ?? 10 * SECOND,
    );

    // Chain message handler to handle pong responses
    ws.onmessage = (ev: MessageEvent) => {
      if (ev.data === "pong") {
        isAlive = true;
      }
      // Always call the original handler for all messages
      if (originalOnMessage) {
        originalOnMessage.call(ws, ev);
      }
    };

    // Chain close handler to clean up heartbeat
    ws.onclose = (ev: CloseEvent) => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (originalOnClose) {
        originalOnClose.call(ws, ev);
      }
    };
  }
}

export default WebSocketKeepAlive;

class AbnormalCloseError extends Error {
  code = "EWSABNORMALCLOSE";
}

/**
 * Interface for errors with error codes.
 * @interface
 * @property {string} [code] - Error code identifier
 * @property {unknown} [cause] - Underlying cause of the error
 */
interface ErrorWithCode {
  code?: string;
  cause?: unknown;
}

/**
 * Type guard to check if an error has an error code.
 * @param {unknown} err - The error to check
 * @returns {boolean} True if the error has a code property
 */
function isErrorWithCode(err: unknown): err is ErrorWithCode {
  return err !== null && typeof err === "object" && "code" in err;
}

function isReconnectable(err: unknown): boolean {
  if (!isErrorWithCode(err)) return false;
  return typeof err.code === "string" && networkErrorCodes.includes(err.code);
}

/**
 * List of error codes that indicate network-related issues.
 * These errors typically warrant a reconnection attempt.
 */
const networkErrorCodes = [
  "EWSABNORMALCLOSE",
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "EPIPE",
  "ETIMEDOUT",
  "ECANCELED",
];

function backoffMs(n: number, maxMs: number) {
  const baseSec = Math.pow(2, n); // 1, 2, 4, ...
  const randSec = Math.random() - 0.5; // Random jitter between -.5 and .5 seconds
  const ms = 1000 * (baseSec + randSec);
  return Math.min(ms, maxMs);
}

function forwardSignal(signal: AbortSignal, ac: AbortController) {
  if (signal.aborted) {
    return ac.abort(signal.reason);
  } else {
    signal.addEventListener("abort", () => ac.abort(signal.reason), {
      // @ts-ignore https://github.com/DefinitelyTyped/DefinitelyTyped/pull/68625
      signal: ac.signal,
    });
  }
}
