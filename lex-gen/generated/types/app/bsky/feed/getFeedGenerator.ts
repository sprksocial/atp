/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";
import type * as AppBskyFeedDefs from "./defs.ts";

export type QueryParams = {
  /** AT-URI of the feed generator record. */
  feed: string;
};
export type InputSchema = undefined;

export interface OutputSchema {
  view: AppBskyFeedDefs.GeneratorView;
  /** Indicates whether the feed generator service has been online recently, or else seems to be inactive. */
  isOnline: boolean;
  /** Indicates whether the feed generator service is compatible with the record declaration. */
  isValid: boolean;
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
