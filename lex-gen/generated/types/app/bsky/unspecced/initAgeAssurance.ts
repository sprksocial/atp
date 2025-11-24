/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";
import type * as AppBskyUnspeccedDefs from "./defs.ts";

export type QueryParams = globalThis.Record<PropertyKey, never>;

export interface InputSchema {
  /** The user's email address to receive assurance instructions. */
  email: string;
  /** The user's preferred language for communication during the assurance process. */
  language: string;
  /** An ISO 3166-1 alpha-2 code of the user's location. */
  countryCode: string;
}

export type OutputSchema = AppBskyUnspeccedDefs.AgeAssuranceState;

export interface CallOptions {
  signal?: AbortSignal;
  headers?: HeadersMap;
  qp?: QueryParams;
  encoding?: "application/json";
}

export interface Response {
  success: boolean;
  headers: HeadersMap;
  data: OutputSchema;
}

export class InvalidEmailError extends XRPCError {
  constructor(src: XRPCError) {
    super(src.status, src.error, src.message, src.headers, { cause: src });
  }
}

export class DidTooLongError extends XRPCError {
  constructor(src: XRPCError) {
    super(src.status, src.error, src.message, src.headers, { cause: src });
  }
}

export class InvalidInitiationError extends XRPCError {
  constructor(src: XRPCError) {
    super(src.status, src.error, src.message, src.headers, { cause: src });
  }
}

export function toKnownErr(e: any) {
  if (e instanceof XRPCError) {
    if (e.error === "InvalidEmail") return new InvalidEmailError(e);
    if (e.error === "DidTooLong") return new DidTooLongError(e);
    if (e.error === "InvalidInitiation") return new InvalidInitiationError(e);
  }

  return e;
}
