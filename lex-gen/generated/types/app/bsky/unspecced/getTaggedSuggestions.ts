/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";
import { validate as _validate } from "../../../../lexicons.ts";
import { is$typed as _is$typed } from "../../../../util.ts";

const is$typed = _is$typed, validate = _validate;
const id = "app.bsky.unspecced.getTaggedSuggestions";

export type QueryParams = globalThis.Record<PropertyKey, never>;
export type InputSchema = undefined;

export interface OutputSchema {
  suggestions: (Suggestion)[];
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

export interface Suggestion {
  $type?: "app.bsky.unspecced.getTaggedSuggestions#suggestion";
  tag: string;
  subjectType:
    | "actor"
    | "feed"
    | (string & globalThis.Record<PropertyKey, never>);
  subject: string;
}

const hashSuggestion = "suggestion";

export function isSuggestion<V>(v: V) {
  return is$typed(v, id, hashSuggestion);
}

export function validateSuggestion<V>(v: V) {
  return validate<Suggestion & V>(v, id, hashSuggestion);
}
