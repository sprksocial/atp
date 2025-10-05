import { ResponseType, XRPCError } from "@atp/xrpc";
import { Frame, type MessageFrame } from "./frames.ts";

/** Convert any WebSocket .data variant into a Uint8Array */
async function toUint8Array(data: unknown): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer()); // we'll handle Blob async below
  if (typeof data === "string") {
    // If your protocol *only* sends binary, you could throw here.
    return new TextEncoder().encode(data);
  }
  throw new XRPCError(
    ResponseType.Unknown,
    undefined,
    "Unsupported WebSocket message data type",
  );
}

/**
 * Async iterator over **binary** chunks arriving on a standard WebSocket.
 * - Yields Uint8Array
 * - Cleans up listeners on close/error/return()
 */
export function iterateBinary(ws: WebSocket): AsyncIterable<Uint8Array> {
  const queue: (Uint8Array | Error | null)[] = [];
  let resolve: ((v: IteratorResult<Uint8Array>) => void) | null = null;

  const pump = () => {
    if (!resolve) return;
    const item = queue.shift();
    if (item === undefined) return;
    const r = resolve;
    resolve = null;

    if (item === null) {
      r({ value: undefined, done: true });
    } else if (item instanceof Error) {
      // turn into iterator throw() path
      // We'll just end and rely on consumer error path
      r(Promise.reject(item) as unknown as IteratorResult<Uint8Array>);
    } else {
      r({ value: item, done: false });
    }
  };

  const onMessage = async (ev: MessageEvent) => {
    try {
      let bytes: Uint8Array;
      if (ev.data instanceof Blob) {
        const buf = await ev.data.arrayBuffer();
        bytes = new Uint8Array(buf);
      } else {
        bytes = await toUint8Array(ev.data);
      }
      queue.push(bytes);
      pump();
    } catch (err) {
      queue.push(err instanceof Error ? err : new Error(String(err)));
      pump();
    }
  };

  const onError = (ev: Event) => {
    const err = (ev as ErrorEvent).error ?? new Error("WebSocket error");
    queue.push(err);
    pump();
  };

  const onClose = () => {
    queue.push(null);
    pump();
  };

  ws.addEventListener("message", onMessage);
  ws.addEventListener("error", onError);
  ws.addEventListener("close", onClose);

  const iterator: AsyncIterator<Uint8Array> = {
    next() {
      return new Promise<IteratorResult<Uint8Array>>((res, rej) => {
        // If something’s already queued, flush immediately
        const item = queue.shift();
        if (item !== undefined) {
          if (item === null) return res({ value: undefined, done: true });
          if (item instanceof Error) return rej(item);
          return res({ value: item, done: false });
        }
        // else park resolver
        resolve = res;
      });
    },
    return() {
      cleanup();
      return Promise.resolve({ value: undefined, done: true });
    },
    throw(err?: unknown) {
      cleanup();
      return Promise.reject(err);
    },
  };

  function cleanup() {
    ws.removeEventListener("message", onMessage);
    ws.removeEventListener("error", onError);
    ws.removeEventListener("close", onClose);
  }

  return {
    [Symbol.asyncIterator]() {
      return iterator;
    },
  };
}

/** Iterate by low-level Frame (binary in → Frame out) */
export async function* byFrame(ws: WebSocket): AsyncGenerator<Frame> {
  for await (const chunk of iterateBinary(ws)) {
    yield Frame.fromBytes(chunk);
  }
}

/** Iterate by validated MessageFrame (errors throw XRPCError) */
export async function* byMessage(
  ws: WebSocket,
): AsyncGenerator<MessageFrame<unknown>> {
  for await (const chunk of iterateBinary(ws)) {
    yield ensureChunkIsMessage(chunk);
  }
}

export function ensureChunkIsMessage(chunk: Uint8Array): MessageFrame<unknown> {
  const frame = Frame.fromBytes(chunk);
  if (frame.isMessage()) {
    return frame;
  } else if (frame.isError()) {
    throw new XRPCError(-1, frame.code, frame.message);
  } else {
    throw new XRPCError(ResponseType.Unknown, undefined, "Unknown frame type");
  }
}
