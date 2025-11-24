/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";
import type * as AppBskyGraphDefs from "./defs.ts";

export type QueryParams = {
  /** The account (actor) to enumerate lists from. */
  actor: string;
  limit?: number;
  cursor?: string;
  /** Optional filter by list purpose. If not specified, all supported types are returned. */
  purposes?:
    | "modlist"
    | "curatelist"
    | (string & globalThis.Record<PropertyKey, never>)[];
};
export type InputSchema = undefined;

export interface OutputSchema {
  cursor?: string;
  lists: (AppBskyGraphDefs.ListView)[];
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
