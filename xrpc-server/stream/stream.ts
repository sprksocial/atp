import { ResponseType, XRPCError } from "@atproto/xrpc";
import { Frame } from "./frames.ts";
import type { MessageFrame } from "./frames.ts";

/**
 * Converts a WebSocket connection into an async generator of Frame objects.
 * Handles both message and error frames, with proper error propagation.
 *
 * @param {WebSocket} ws - The WebSocket connection to read from
 * @yields {Frame} Each frame received from the WebSocket
 * @throws {Error} Any WebSocket error that occurs during communication
 *
 * @example
 * ```typescript
 * const ws = new WebSocket(url);
 * for await (const frame of byFrame(ws)) {
 *   // Process each frame
 *   console.log(frame.type);
 * }
 * ```
 */
export async function* byFrame(
  ws: WebSocket,
): AsyncGenerator<Frame> {
  const messageQueue: Frame[] = [];
  let error: Error | null = null;
  let done = false;

  ws.onmessage = (ev) => {
    if (ev.data instanceof Uint8Array) {
      messageQueue.push(Frame.fromBytes(ev.data));
    }
  };
  ws.onerror = (ev) => {
    if (ev instanceof ErrorEvent) {
      error = ev.error;
    }
  };
  ws.onclose = () => {
    done = true;
  };

  while (!done && !error) {
    if (messageQueue.length > 0) {
      yield messageQueue.shift()!;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  if (error) throw error;
}

/**
 * Converts a WebSocket connection into an async generator of MessageFrames.
 * Automatically filters and validates frames to ensure they are valid messages.
 * Error frames are converted to exceptions.
 *
 * @param {WebSocket} ws - The WebSocket connection to read from
 * @yields {MessageFrame<unknown>} Each message frame received from the WebSocket
 * @throws {XRPCError} If an error frame is received or an invalid frame type is encountered
 *
 * @example
 * ```typescript
 * const ws = new WebSocket(url);
 * for await (const message of byMessage(ws)) {
 *   // Process each message
 *   console.log(message.body);
 * }
 * ```
 */
export async function* byMessage(
  ws: WebSocket,
): AsyncGenerator<MessageFrame<unknown>> {
  for await (const frame of byFrame(ws)) {
    yield ensureChunkIsMessage(frame);
  }
}

/**
 * Validates that a frame is a MessageFrame and converts it to the appropriate type.
 * If the frame is an error frame, throws an XRPCError with the error details.
 *
 * @param {Frame} frame - The frame to validate
 * @returns {MessageFrame<unknown>} The frame as a MessageFrame if valid
 * @throws {XRPCError} If the frame is an error frame or an invalid type
 * @internal
 */
export function ensureChunkIsMessage(frame: Frame): MessageFrame<unknown> {
  if (frame.isMessage()) {
    return frame;
  } else if (frame.isError()) {
    // @TODO work -1 error code into XRPCError
    throw new XRPCError(-1, frame.code, frame.message);
  } else {
    throw new XRPCError(ResponseType.Unknown, undefined, "Unknown frame type");
  }
}
