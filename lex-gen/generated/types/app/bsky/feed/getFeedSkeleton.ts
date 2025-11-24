/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";
import type * as AppBskyFeedDefs from "./defs.ts";

export type QueryParams = {
  /** Reference to feed generator record describing the specific feed being requested. */
  feed: string;
  limit?: number;
  cursor?: string;
};
export type InputSchema = undefined;

export interface OutputSchema {
  cursor?: string;
  feed: (AppBskyFeedDefs.SkeletonFeedPost)[];
  /** Unique identifier per request that may be passed back alongside interactions. */
  reqId?: string;
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

export class UnknownFeedError extends XRPCError {
  constructor(src: XRPCError) {
    super(src.status, src.error, src.message, src.headers, { cause: src });
  }
}

export function toKnownErr(e: any) {
  if (e instanceof XRPCError) {
    if (e.error === "UnknownFeed") return new UnknownFeedError(e);
  }

  return e;
}
