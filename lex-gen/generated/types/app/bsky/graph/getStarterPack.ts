/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";
import type * as AppBskyGraphDefs from "./defs.ts";

export type QueryParams = {
  /** Reference (AT-URI) of the starter pack record. */
  starterPack: string;
};
export type InputSchema = undefined;

export interface OutputSchema {
  starterPack: AppBskyGraphDefs.StarterPackView;
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
