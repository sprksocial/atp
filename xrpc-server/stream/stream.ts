import type { DuplexOptions } from "node:stream";
import { createWebSocketStream, type WebSocket } from "ws";
import { ResponseType, XRPCError } from "@atp/xrpc";
import { Frame, type MessageFrame } from "./frames.ts";

export function streamByteChunks(ws: WebSocket, options?: DuplexOptions) {
  return createWebSocketStream(ws, {
    ...options,
    readableObjectMode: true, // Ensures frame bytes don't get buffered/combined together
  });
}

export async function* byFrame(ws: WebSocket, options?: DuplexOptions) {
  const wsStream = streamByteChunks(ws, options);
  for await (const chunk of wsStream) {
    yield Frame.fromBytes(chunk);
  }
}

export async function* byMessage(ws: WebSocket, options?: DuplexOptions) {
  const wsStream = streamByteChunks(ws, options);
  for await (const chunk of wsStream) {
    const msg = ensureChunkIsMessage(chunk);
    yield msg;
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
