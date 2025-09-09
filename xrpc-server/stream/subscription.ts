import { ensureChunkIsMessage } from "./stream.ts";
import { WebSocketKeepAlive } from "./websocket-keepalive.ts";
import { Frame } from "./frames.ts";
import type { WebSocketOptions } from "./types.ts";

/**
 * Represents a message body in a subscription stream.
 * @interface
 * @property {string} [$type] - Optional type identifier for the message
 * @property {unknown} [key: string] - Additional message properties
 */
interface MessageBody {
  $type?: string;
  [key: string]: unknown;
}

/**
 * Represents a subscription to an XRPC streaming endpoint.
 * Handles WebSocket connection management, reconnection, and message parsing.
 * @class
 * @template T - The type of messages yielded by the subscription
 */
export class Subscription<T = unknown> {
  /**
   * Creates a new subscription instance.
   * @constructor
   * @param {Object} opts - Subscription configuration options
   * @param {string} opts.service - The base URL of the XRPC service
   * @param {string} opts.method - The XRPC method to subscribe to
   * @param {number} [opts.maxReconnectSeconds] - Maximum time in seconds between reconnection attempts
   * @param {number} [opts.heartbeatIntervalMs] - Interval in milliseconds for sending heartbeat messages
   * @param {AbortSignal} [opts.signal] - Signal for aborting the subscription
   * @param {Function} opts.validate - Function to validate and transform incoming messages
   * @param {Function} [opts.onReconnectError] - Callback for handling reconnection errors
   * @param {Function} [opts.getParams] - Function to get query parameters for the subscription URL
   */
  constructor(
    public opts: WebSocketOptions & {
      service: string;
      method: string;
      maxReconnectSeconds?: number;
      heartbeatIntervalMs?: number;
      signal?: AbortSignal;
      validate: (obj: unknown) => T | undefined;
      onReconnectError?: (
        error: unknown,
        n: number,
        initialSetup: boolean,
      ) => void;
      getParams?: () =>
        | Record<string, unknown>
        | Promise<Record<string, unknown> | undefined>
        | undefined;
    },
  ) {}

  /**
   * Implements the AsyncIterator protocol for the subscription.
   * Allows using the subscription in a for-await-of loop.
   * @returns {AsyncGenerator<T>} An async generator that yields validated messages
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    const ws = new WebSocketKeepAlive({
      ...this.opts,
      getUrl: async () => {
        const params = (await this.opts.getParams?.()) ?? {};
        const query = encodeQueryParams(params);
        return `${this.opts.service}/xrpc/${this.opts.method}?${query}`;
      },
    });
    for await (const chunk of ws) {
      const frame = Frame.fromBytes(chunk);
      const message = ensureChunkIsMessage(frame);
      const t = message.header.t;
      const clone = message.body !== undefined
        ? { ...message.body } as MessageBody
        : undefined;
      if (clone !== undefined && t !== undefined) {
        clone.$type = t.startsWith("#") ? this.opts.method + t : t;
      }
      const result = this.opts.validate(clone);
      if (result !== undefined) {
        yield result;
      }
    }
  }
}

export default Subscription;

/**
 * Encodes an object of parameters into a URL query string.
 * @param {Record<string, unknown>} obj - The parameters to encode
 * @returns {string} The encoded query string
 */
function encodeQueryParams(obj: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    const encoded = encodeQueryParam(value);
    if (Array.isArray(encoded)) {
      encoded.forEach((enc) => params.append(key, enc));
    } else {
      params.set(key, encoded);
    }
  });
  return params.toString();
}

/**
 * Encodes a single query parameter value into a string or array of strings.
 * Handles various types including strings, numbers, booleans, dates, and arrays.
 * @param {unknown} value - The value to encode
 * @returns {string | string[]} The encoded parameter value(s)
 * @throws {Error} If the value cannot be encoded as a query parameter
 */
function encodeQueryParam(value: unknown): string | string[] {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "undefined") {
    return "";
  }
  if (typeof value === "object") {
    if (value instanceof Date) {
      return value.toISOString();
    } else if (Array.isArray(value)) {
      return value.flatMap(encodeQueryParam);
    } else if (!value) {
      return "";
    }
  }
  throw new Error(`Cannot encode ${typeof value}s into query params`);
}
