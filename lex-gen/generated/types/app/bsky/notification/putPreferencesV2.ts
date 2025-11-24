/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atp/xrpc";
import type * as AppBskyNotificationDefs from "./defs.ts";

export type QueryParams = globalThis.Record<PropertyKey, never>;

export interface InputSchema {
  chat?: AppBskyNotificationDefs.ChatPreference;
  follow?: AppBskyNotificationDefs.FilterablePreference;
  like?: AppBskyNotificationDefs.FilterablePreference;
  likeViaRepost?: AppBskyNotificationDefs.FilterablePreference;
  mention?: AppBskyNotificationDefs.FilterablePreference;
  quote?: AppBskyNotificationDefs.FilterablePreference;
  reply?: AppBskyNotificationDefs.FilterablePreference;
  repost?: AppBskyNotificationDefs.FilterablePreference;
  repostViaRepost?: AppBskyNotificationDefs.FilterablePreference;
  starterpackJoined?: AppBskyNotificationDefs.Preference;
  subscribedPost?: AppBskyNotificationDefs.Preference;
  unverified?: AppBskyNotificationDefs.Preference;
  verified?: AppBskyNotificationDefs.Preference;
}

export interface OutputSchema {
  preferences: AppBskyNotificationDefs.Preferences;
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
  data: OutputSchema;
}

export function toKnownErr(e: any) {
  return e;
}
