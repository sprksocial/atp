/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";
import type * as AppBskyActorDefs from "./defs.ts";

export type QueryParams = {
  limit?: number;
  cursor?: string;
};
export type InputSchema = undefined;

export interface OutputSchema {
  cursor?: string;
  actors: (AppBskyActorDefs.ProfileView)[];
  /** Snowflake for this recommendation, use when submitting recommendation events. */
  recId?: number;
}

export interface CallOptions {
  signal?: AbortSignal;
  headers?: HeadersMap;
}

export interface Response {
  success: boolean;
  headers: HeadersMap;
  data: OutputSchema;
}

export function toKnownErr(e: any) {
  return e;
}
