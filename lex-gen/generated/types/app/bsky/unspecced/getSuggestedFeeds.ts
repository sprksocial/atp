/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";
import type * as AppBskyFeedDefs from "../feed/defs.ts";

export type QueryParams = {
  limit?: number;
};
export type InputSchema = undefined;

export interface OutputSchema {
  feeds: (AppBskyFeedDefs.GeneratorView)[];
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
