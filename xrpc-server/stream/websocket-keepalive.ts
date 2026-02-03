import { type ClientOptions, createWebSocketStream, WebSocket } from "ws";
import { isErrnoException, SECOND, wait } from "@atp/common";
import { CloseCode, DisconnectError } from "./types.ts";

export type KeepAliveOptions = ClientOptions & {
  getUrl: () => Promise<string>;
  maxReconnectSeconds?: number;
  signal?: AbortSignal;
  heartbeatIntervalMs?: number;
  onReconnectError?: (
    error: unknown,
    n: number,
    initialSetup: boolean,
  ) => void;
};

export class WebSocketKeepAlive {
  public ws: WebSocket | null = null;
  public initialSetup = true;
  public reconnects: number | null = null;

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
      this.ws = new WebSocket(url, this.opts);
      const ac = new AbortController();
      if (this.opts.signal) {
        forwardSignal(this.opts.signal, ac);
      }
      this.ws.once("open", () => {
        this.initialSetup = false;
        this.reconnects = 0;
        if (this.ws) {
          this.startHeartbeat(this.ws);
        }
      });
      this.ws.once("close", (code: number, reason: Uint8Array) => {
        if (code === CloseCode.Abnormal) {
          ac.abort(
            new AbnormalCloseError(
              `Abnormal ws close: ${new TextDecoder().decode(reason)}`,
            ),
          );
        }
      });

      try {
        const wsStream = createWebSocketStream(this.ws, {
          signal: ac.signal,
          readableObjectMode: true,
        });
        for await (const chunk of wsStream) {
          yield chunk;
        }
      } catch (_err) {
        const err = isErrnoException(_err) && _err.code === "ABORT_ERR"
          ? _err.cause
          : _err;
        if (err instanceof DisconnectError) {
          this.ws?.close(err.wsCode);
          break;
        }
        this.ws?.close();
        if (isReconnectable(err)) {
          this.reconnects ??= 0;
          this.opts.onReconnectError?.(err, this.reconnects, this.initialSetup);
          continue;
        } else {
          throw err;
        }
      }
      break;
    }
  }

  startHeartbeat(ws: WebSocket) {
    let isAlive = true;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    const checkAlive = () => {
      if (!isAlive) {
        return ws.terminate();
      }
      isAlive = false;
      ws.ping();
    };

    checkAlive();
    heartbeatInterval = setInterval(
      checkAlive,
      this.opts.heartbeatIntervalMs ?? 10 * SECOND,
    );

    ws.on("pong", () => {
      isAlive = true;
    });
    ws.once("close", () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    });
  }
}

export default WebSocketKeepAlive;

class AbnormalCloseError extends Error {
  code = "EWSABNORMALCLOSE";
}

function isReconnectable(err: unknown): boolean {
  if (isErrnoException(err) && typeof err.code === "string") {
    return networkErrorCodes.includes(err.code);
  }
  return false;
}

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
  const baseSec = Math.pow(2, n);
  const randSec = Math.random() - 0.5;
  const ms = 1000 * (baseSec + randSec);
  return Math.min(ms, maxMs);
}

function forwardSignal(signal: AbortSignal, ac: AbortController) {
  if (signal.aborted) {
    return ac.abort(signal.reason);
  } else {
    signal.addEventListener("abort", () => ac.abort(signal.reason), {
      signal: ac.signal,
    });
  }
}
