import * as uint8arrays from "uint8arrays";
import { cborDecodeMulti, cborEncode } from "@atp/common";
import type {
  ErrorFrameBody,
  ErrorFrameHeader,
  FrameHeader,
  MessageFrameHeader,
} from "./types.ts";
import { errorFrameBody, frameHeader, FrameType } from "./types.ts";

/**
 * Abstract base class for XRPC stream frames.
 * Frames are the basic unit of communication in XRPC streaming, consisting of a header and body.
 * Each frame is serialized as CBOR for efficient binary transmission.
 *
 * @abstract
 * @property {FrameHeader} header - Frame header containing operation type and metadata
 * @property {unknown} body - Frame payload data
 */
export abstract class Frame {
  abstract header: FrameHeader;
  body: unknown;

  /**
   * Gets the operation type of the frame.
   * @returns {FrameType} The frame's operation type
   */
  get op(): FrameType {
    return this.header.op;
  }

  /**
   * Serializes the frame to a binary format using CBOR encoding.
   * The resulting bytes contain both the header and body concatenated.
   * @returns {Uint8Array} The serialized frame as bytes
   */
  toBytes(): Uint8Array {
    return uint8arrays.concat([cborEncode(this.header), cborEncode(this.body)]);
  }

  /**
   * Type guard to check if this frame is a MessageFrame.
   * @returns {boolean} True if this is a MessageFrame
   */
  isMessage(): this is MessageFrame<unknown> {
    return this.op === FrameType.Message;
  }

  /**
   * Type guard to check if this frame is an ErrorFrame.
   * @returns {boolean} True if this is an ErrorFrame
   */
  isError(): this is ErrorFrame {
    return this.op === FrameType.Error;
  }

  /**
   * Deserializes a frame from its binary representation.
   * Validates the frame structure and creates the appropriate frame type.
   *
   * @param {Uint8Array} bytes - The serialized frame bytes
   * @returns {Frame} The deserialized frame (either MessageFrame or ErrorFrame)
   * @throws {Error} If the frame format is invalid or unknown
   */
  static fromBytes(bytes: Uint8Array): Frame {
    const decoded = cborDecodeMulti(bytes);
    if (decoded.length > 2) {
      throw new Error("Too many CBOR data items in frame");
    }
    const header = decoded[0];
    let body: unknown = kUnset;
    if (decoded.length > 1) {
      body = decoded[1];
    }
    const parsedHeader = frameHeader.safeParse(header);
    if (!parsedHeader.success) {
      throw new Error(`Invalid frame header: ${parsedHeader.error.message}`);
    }
    if (body === kUnset) {
      throw new Error("Missing frame body");
    }
    const frameOp = parsedHeader.data.op;
    if (frameOp === FrameType.Message) {
      return new MessageFrame(body, {
        type: parsedHeader.data.t,
      });
    } else if (frameOp === FrameType.Error) {
      const parsedBody = errorFrameBody.safeParse(body);
      if (!parsedBody.success) {
        throw new Error(
          `Invalid error frame body: ${parsedBody.error.message}`,
        );
      }
      return new ErrorFrame(parsedBody.data);
    } else {
      const exhaustiveCheck: never = frameOp;
      throw new Error(`Unknown frame op: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Frame type for sending messages/data over an XRPC stream.
 * Can contain any type of payload data and an optional message type identifier.
 *
 * @template T - The type of the message body, defaults to Record<string, unknown>
 * @extends {Frame}
 * @property {MessageFrameHeader} header - Message frame header
 * @property {T} body - Message payload data
 */
export class MessageFrame<T = Record<string, unknown>> extends Frame {
  header: MessageFrameHeader;
  override body: T;

  /**
   * Creates a new MessageFrame.
   * @param {T} body - The message payload
   * @param {Object} [opts] - Optional frame configuration
   * @param {string} [opts.type] - Message type identifier
   */
  constructor(body: T, opts?: { type?: string }) {
    super();
    this.header = opts?.type !== undefined
      ? { op: FrameType.Message, t: opts?.type }
      : { op: FrameType.Message };
    this.body = body;
  }

  /**
   * Gets the message type identifier.
   * @returns {string | undefined} The message type, if specified
   */
  get type(): string | undefined {
    return this.header.t;
  }
}

/**
 * Frame type for sending errors over an XRPC stream.
 * Contains an error code and optional error message.
 *
 * @template T - The type of error code string
 * @extends {Frame}
 * @property {ErrorFrameHeader} header - Error frame header
 * @property {ErrorFrameBody<T>} body - Error details including code and message
 */
export class ErrorFrame<T extends string = string> extends Frame {
  header: ErrorFrameHeader;
  override body: ErrorFrameBody<T>;

  /**
   * Creates a new ErrorFrame.
   * @param {ErrorFrameBody<T>} body - The error details
   */
  constructor(body: ErrorFrameBody<T>) {
    super();
    this.header = { op: FrameType.Error };
    this.body = body;
  }

  /**
   * Gets the error code.
   * @returns {string} The error code
   */
  get code(): string {
    return this.body.error;
  }

  /**
   * Gets the error message.
   * @returns {string | undefined} The error message, if provided
   */
  get message(): string | undefined {
    return this.body.message;
  }
}

/**
 * Symbol used internally to detect unset frame body.
 * @private
 */
const kUnset = Symbol("unset");
