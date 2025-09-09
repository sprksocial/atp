import { SECOND, wait } from "@atp/common";
import { CloseCode, DisconnectError, type WebSocketOptions } from "./types.ts";

/**
 * WebSocket client with automatic reconnection and heartbeat functionality.
 * Handles connection management, reconnection backoff, and keep-alive messages.
 * @class
 */
export class WebSocketKeepAlive {
  /** Current WebSocket connection instance */
  public ws: WebSocket | null = null;
  /** Whether this is the first connection attempt */
  public initialSetup = true;
  /** Number of reconnection attempts made, or null if not reconnecting */
  public reconnects: number | null = null;

  /**
   * Creates a new WebSocket client with keep-alive functionality.
   * @constructor
   * @param {Object} opts - Client configuration options
   * @param {Function} opts.getUrl - Function to get the WebSocket URL
   * @param {number} [opts.maxReconnectSeconds] - Maximum backoff time between reconnection attempts
   * @param {AbortSignal} [opts.signal] - Signal for aborting the connection
   * @param {number} [opts.heartbeatIntervalMs] - Interval between heartbeat messages
   * @param {Function} [opts.onReconnectError] - Callback for handling reconnection errors
   */
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

  /**
   * Implements the AsyncIterator protocol for receiving WebSocket messages.
   * Handles automatic reconnection and message buffering.
   * @returns {AsyncGenerator<Uint8Array>} An async generator that yields received messages
   */
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
        let done = false;

        this.ws.onmessage = (ev: MessageEvent) => {
          if (ev.data instanceof Uint8Array) {
            messageQueue.push(ev.data);
          }
        };
        this.ws.onerror = (ev: Event | ErrorEvent) => {
          if (ev instanceof ErrorEvent) {
            error = ev.error;
          }
        };
        this.ws.onclose = () => {
          done = true;
        };

        while (!done && !error && !ac.signal.aborted) {
          if (messageQueue.length > 0) {
            yield messageQueue.shift()!;
          } else {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
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

  /**
   * Starts the heartbeat mechanism for a WebSocket connection.
   * Sends periodic ping messages and monitors for pong responses.
   * @param {WebSocket} ws - The WebSocket connection to monitor
   */
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

    checkAlive();
    heartbeatInterval = setInterval(
      checkAlive,
      this.opts.heartbeatIntervalMs ?? 10 * SECOND,
    );

    ws.onmessage = (ev: MessageEvent) => {
      if (ev.data === "pong") {
        isAlive = true;
      }
    };
    ws.onclose = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };
  }
}

export default WebSocketKeepAlive;

/**
 * Error class for abnormal WebSocket closures.
 * @class
 * @extends Error
 */
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

/**
 * Checks if an error should trigger a reconnection attempt.
 * Network-related errors are typically reconnectable.
 * @param {unknown} err - The error to check
 * @returns {boolean} True if the error should trigger a reconnection
 */
function isReconnectable(err: unknown): boolean {
  // Network errors are reconnectable.
  // AuthenticationRequired and InvalidRequest XRPCErrors are not reconnectable.
  // @TODO method-specific XRPCErrors may be reconnectable, need to consider. Receiving
  // an invalid message is not current reconnectable, but the user can decide to skip them.
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

/**
 * Calculates the backoff duration for reconnection attempts.
 * Uses exponential backoff with random jitter.
 * @param {number} n - The number of reconnection attempts so far
 * @param {number} maxMs - Maximum backoff duration in milliseconds
 * @returns {number} The backoff duration in milliseconds
 */
function backoffMs(n: number, maxMs: number) {
  const baseSec = Math.pow(2, n); // 1, 2, 4, ...
  const randSec = Math.random() - 0.5; // Random jitter between -.5 and .5 seconds
  const ms = 1000 * (baseSec + randSec);
  return Math.min(ms, maxMs);
}

/**
 * Forwards abort signals from one AbortController to another.
 * @param {AbortSignal} signal - The source abort signal
 * @param {AbortController} ac - The target abort controller
 */
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
