import { ensureChunkIsMessage } from "./stream.ts";
import { WebSocketKeepAlive } from "./websocket-keepalive.ts";

export class Subscription<T = unknown> {
  constructor(
    public opts: {
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

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    // Internal controller so we can always terminate the underlying keep-alive loop
    // when the consumer stops iterating (preventing leaked timers / sockets).
    const internalAc = new AbortController();

    // Bridge external signal (if provided) into our internal controller.
    if (this.opts.signal) {
      if (this.opts.signal.aborted) {
        internalAc.abort(this.opts.signal.reason);
      } else {
        const onAbort = () => internalAc.abort(this.opts.signal!.reason);
        this.opts.signal.addEventListener("abort", onAbort, { once: true });
      }
    }

    const ws = new WebSocketKeepAlive({
      ...this.opts,
      // Override signal with the internal one we control for cleanup.
      signal: internalAc.signal,
      getUrl: async () => {
        const params = (await this.opts.getParams?.()) ?? {};
        const query = encodeQueryParams(params);
        return `${this.opts.service}/xrpc/${this.opts.method}?${query}`;
      },
    });

    try {
      for await (const chunk of ws) {
        const message = ensureChunkIsMessage(chunk);
        const t = message.header.t;
        const clone = message.body !== undefined
          ? { ...message.body }
          : undefined;

        // Reconstruct $type on the message body if a header type is present.
        // Original server stripped $type into the frame header; client restores it.
        if (clone !== undefined && t !== undefined) {
          (clone as Record<string, unknown>)["$type"] = t.startsWith("#")
            ? this.opts.method + t
            : t;
        }

        const result = this.opts.validate(clone);
        if (result !== undefined) {
          yield result;
        }
      }
    } finally {
      // Ensure we stop heartbeats & close socket to avoid leaking intervals / timers.
      internalAc.abort();
      try {
        ws.ws?.close(1000);
      } catch {
        /* ignore */
      }
    }
  }
}

export default Subscription;

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

// Adapted from xrpc, but without any lex-specific knowledge
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
