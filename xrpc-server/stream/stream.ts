import { ResponseType, XRPCError } from "@atp/xrpc";
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
  // Wait for connection if still connecting
  if (ws.readyState === WebSocket.CONNECTING) {
    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("error", onError);
        resolve();
      };

      const onError = (event: Event | ErrorEvent) => {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("error", onError);
        const error = event instanceof ErrorEvent && event.error
          ? event.error
          : new Error("WebSocket connection failed");
        reject(error);
      };

      ws.addEventListener("open", onOpen);
      ws.addEventListener("error", onError);
    });
  }

  // If already closed, return immediately
  if (ws.readyState === WebSocket.CLOSED) {
    return;
  }

  // Process messages until connection closes
  while (ws.readyState === WebSocket.OPEN) {
    try {
      const frame = await waitForNextFrame(ws);
      if (frame) {
        yield frame;
      } else {
        // Connection closed normally
        break;
      }
    } catch (error) {
      // WebSocket error occurred
      throw error;
    }
  }
}

/**
 * Waits for the next frame from a WebSocket connection.
 * Returns null if the connection closes normally.
 */
function waitForNextFrame(ws: WebSocket): Promise<Frame | null> {
  return new Promise<Frame | null>((resolve, reject) => {
    const cleanup = () => {
      ws.removeEventListener("message", onMessage);
      ws.removeEventListener("error", onError);
      ws.removeEventListener("close", onClose);
    };

    const onMessage = async (event: MessageEvent) => {
      cleanup();
      try {
        let data: Uint8Array;
        if (event.data instanceof Uint8Array) {
          data = event.data;
        } else if (event.data instanceof Blob) {
          data = new Uint8Array(await event.data.arrayBuffer());
        } else {
          // Ignore non-binary data (e.g., ping/pong)
          // Re-attach listeners and wait for next message
          attachListeners();
          return;
        }

        const frame = Frame.fromBytes(data);
        resolve(frame);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };

    const onError = (event: Event | ErrorEvent) => {
      cleanup();
      const error = event instanceof ErrorEvent && event.error
        ? event.error
        : new Error("WebSocket error");
      reject(error);
    };

    const onClose = () => {
      cleanup();
      resolve(null); // Signal end of stream
    };

    const attachListeners = () => {
      ws.addEventListener("message", onMessage, { once: true });
      ws.addEventListener("error", onError, { once: true });
      ws.addEventListener("close", onClose, { once: true });
    };

    // Check if connection is already closed before attaching listeners
    if (ws.readyState === WebSocket.CLOSED) {
      resolve(null);
      return;
    }

    attachListeners();
  });
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
    throw new XRPCError(3, frame.code, frame.message);
  } else {
    throw new XRPCError(ResponseType.Unknown, undefined, "Unknown frame type");
  }
}
