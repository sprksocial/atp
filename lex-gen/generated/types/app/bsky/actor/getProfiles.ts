/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";
import type * as AppBskyActorDefs from "./defs.ts";

export type QueryParams = {
  actors: string[];
};
export type InputSchema = undefined;

export interface OutputSchema {
  profiles: (AppBskyActorDefs.ProfileViewDetailed)[];
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
