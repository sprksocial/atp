import {
  ensureValidAtUri,
  ensureValidDid,
  ensureValidHandle,
  ensureValidNsid,
  ensureValidRecordKey,
  ensureValidTid,
} from "@atp/syntax";
import { ensureValidCidString } from "../data/cid.ts";
import { isLanguage } from "../data/strings.ts";

declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

export type DidString = Brand<string, "did">;
export type HandleString = Brand<string, "handle">;
export type AtUriString = Brand<string, "at-uri">;
export type AtIdentifierString = Brand<string, "at-identifier">;
export type NsidString = `${string}.${string}.${string}`;
export type CidString = Brand<string, "cid">;
export type TidString = Brand<string, "tid">;
export type RecordKeyString = Brand<string, "record-key">;
export type DatetimeString = Brand<string, "datetime">;
export type UriString = `${string}:${string}`;
export type LanguageString = string;

export const STRING_FORMATS = Object.freeze(
  [
    "datetime",
    "uri",
    "at-uri",
    "did",
    "handle",
    "at-identifier",
    "nsid",
    "cid",
    "language",
    "tid",
    "record-key",
  ] as const,
);

export type StringFormat = (typeof STRING_FORMATS)[number];

export type InferStringFormat<F> = F extends "datetime" ? DatetimeString
  : F extends "uri" ? UriString
  : F extends "at-uri" ? AtUriString
  : F extends "did" ? DidString
  : F extends "handle" ? HandleString
  : F extends "at-identifier" ? AtIdentifierString
  : F extends "nsid" ? NsidString
  : F extends "cid" ? CidString
  : F extends "language" ? LanguageString
  : F extends "tid" ? TidString
  : F extends "record-key" ? RecordKeyString
  : string;

export function assertDid(input: string): asserts input is DidString {
  ensureValidDid(input);
}

export function assertHandle(input: string): asserts input is HandleString {
  ensureValidHandle(input);
}

export function assertAtUri(input: string): asserts input is AtUriString {
  ensureValidAtUri(input);
}

export function assertAtIdentifier(
  input: string,
): asserts input is AtIdentifierString {
  try {
    ensureValidDid(input);
    return;
  } catch {
    // did format failed
  }
  ensureValidHandle(input);
}

export function assertNsid(input: string): asserts input is NsidString {
  ensureValidNsid(input);
}

export function assertTid(input: string): asserts input is TidString {
  ensureValidTid(input);
}

export function assertRecordKey(
  input: string,
): asserts input is RecordKeyString {
  ensureValidRecordKey(input);
}

export function assertDatetime(input: string): asserts input is DatetimeString {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      input,
    )
  ) {
    throw new Error(`Invalid datetime: ${input}`);
  }
}

export function assertCidString(input: string): asserts input is CidString {
  ensureValidCidString(input);
}

export function assertUri(input: string): asserts input is UriString {
  if (!/^\w+:(?:\/\/)?[^\s/][^\s]*$/.test(input)) {
    throw new Error("Invalid URI");
  }
}

export function assertLanguage(
  input: string,
): asserts input is LanguageString {
  if (!isLanguage(input)) {
    throw new Error("Invalid BCP 47 string");
  }
}

const formatters = new Map<StringFormat, (str: string) => void>(
  [
    ["datetime", assertDatetime],
    ["uri", assertUri],
    ["at-uri", assertAtUri],
    ["did", assertDid],
    ["handle", assertHandle],
    ["at-identifier", assertAtIdentifier],
    ["nsid", assertNsid],
    ["cid", assertCidString],
    ["language", assertLanguage],
    ["tid", assertTid],
    ["record-key", assertRecordKey],
  ] as const,
);

export function assertStringFormat<F extends StringFormat>(
  input: string,
  format: F,
): asserts input is InferStringFormat<F> {
  const assertFn = formatters.get(format);
  if (assertFn) assertFn(input);
  else throw new Error(`Unknown string format: ${format}`);
}
