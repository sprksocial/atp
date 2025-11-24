/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";
import type { $Typed } from "../../../../util.ts";
import type * as AppBskyLabelerDefs from "./defs.ts";

export type QueryParams = {
  dids: string[];
  detailed?: boolean;
};
export type InputSchema = undefined;

export interface OutputSchema {
  views: (
    | $Typed<AppBskyLabelerDefs.LabelerView>
    | $Typed<AppBskyLabelerDefs.LabelerViewDetailed>
    | { $type: string }
  )[];
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
