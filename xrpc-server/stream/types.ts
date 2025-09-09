import { z } from "zod";

/**
 * Enumeration of frame types used in the XRPC streaming protocol.
 * @enum {number}
 */
export enum FrameType {
  /** Normal message frame */
  Message = 1,
  /** Error message frame */
  Error = -1,
}

/**
 * WebSocket connection options.
 * @interface
 * @property {Record<string, string>} [headers] - Additional headers for the WebSocket connection
 * @property {string[]} [protocols] - WebSocket subprotocols to use
 */
export interface WebSocketOptions {
  headers?: Record<string, string>;
  protocols?: string[];
}

/**
 * Header for message frames.
 * @interface
 * @property {FrameType.Message} op - Operation type, always Message
 * @property {string} [t] - Optional message type discriminator
 */
export type MessageFrameHeader = {
  op: FrameType.Message;
  t?: string;
};

export const messageFrameHeader = z.object({
  op: z.literal(FrameType.Message), // Frame op
  t: z.string().optional(), // Message body type discriminator
}).strict() as z.ZodType<MessageFrameHeader>;

/**
 * Header for error frames.
 * @interface
 * @property {FrameType.Error} op - Operation type, always Error
 */
export type ErrorFrameHeader = {
  op: FrameType.Error;
};

export const errorFrameHeader = z.object({
  op: z.literal(FrameType.Error),
}).strict() as z.ZodType<ErrorFrameHeader>;

/**
 * Base type for error frame bodies.
 * @interface
 * @property {string} error - Error code or identifier
 * @property {string} [message] - Optional error message
 */
export type ErrorFrameBodyBase = {
  error: string;
  message?: string;
};

/**
 * Generic error frame body with typed error codes.
 * @template T - The type of error codes allowed
 * @interface
 * @property {T} error - Typed error code
 * @property {string} [message] - Optional error message
 */
export type ErrorFrameBody<T extends string = string> = {
  error: T;
  message?: string;
};

export const errorFrameBody = z.object({
  error: z.string(), // Error code
  message: z.string().optional(), // Error message
}).strict() as z.ZodType<ErrorFrameBodyBase>;

/**
 * Union type for all frame headers.
 * Can be either a message frame header or an error frame header.
 */
export type FrameHeader = MessageFrameHeader | ErrorFrameHeader;

export const frameHeader = z.union([
  messageFrameHeader,
  errorFrameHeader,
]) as z.ZodType<FrameHeader>;

/**
 * Error class for handling WebSocket disconnections.
 * @class
 * @extends Error
 * @property {CloseCode} wsCode - WebSocket close code
 * @property {string} [xrpcCode] - XRPC-specific error code
 */
export class DisconnectError extends Error {
  constructor(
    public wsCode: CloseCode = CloseCode.Policy,
    public xrpcCode?: string,
  ) {
    super();
  }
}

/**
 * WebSocket close codes as defined in RFC 6455.
 * @see https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1
 * @enum {number}
 */
export enum CloseCode {
  /** Normal closure, meaning the purpose for which the connection was established has been fulfilled */
  Normal = 1000,
  /** Abnormal closure, meaning that the connection was terminated in an abnormal way */
  Abnormal = 1006,
  /** Policy violation, meaning the endpoint is terminating the connection due to a policy violation */
  Policy = 1008,
}
