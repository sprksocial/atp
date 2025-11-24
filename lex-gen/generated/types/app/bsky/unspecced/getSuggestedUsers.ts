/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";
import type * as AppBskyActorDefs from "../actor/defs.ts";

export type QueryParams = {
  /** Category of users to get suggestions for. */
  category?: string;
  limit?: number;
};
export type InputSchema = undefined;

export interface OutputSchema {
  actors: (AppBskyActorDefs.ProfileView)[];
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
