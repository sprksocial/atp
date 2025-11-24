/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";

export type QueryParams = globalThis.Record<PropertyKey, never>;

export interface InputSchema {
  serviceDid: string;
  token: string;
  platform:
    | "ios"
    | "android"
    | "web"
    | (string & globalThis.Record<PropertyKey, never>);
  appId: string;
  /** Set to true when the actor is age restricted */
  ageRestricted?: boolean;
}

export interface CallOptions {
  signal?: AbortSignal;
  headers?: HeadersMap;
  qp?: QueryParams;
  encoding?: "application/json";
}

export interface Response {
  success: boolean;
  headers: HeadersMap;
}

export function toKnownErr(e: any) {
  return e;
}
