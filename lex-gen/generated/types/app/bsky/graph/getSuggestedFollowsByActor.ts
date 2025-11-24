/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";
import type * as AppBskyActorDefs from "../actor/defs.ts";

export type QueryParams = {
  actor: string;
};
export type InputSchema = undefined;

export interface OutputSchema {
  suggestions: (AppBskyActorDefs.ProfileView)[];
  /** If true, response has fallen-back to generic results, and is not scoped using relativeToDid */
  isFallback?: boolean;
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
