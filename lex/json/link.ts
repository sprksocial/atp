import { type Cid, parseCid } from "../data/cid.ts";
import type { JsonValue } from "./json.ts";

export function parseLexLink(
  input?: Record<string, unknown>,
): Cid | undefined {
  if (!input || !("$link" in input)) {
    return undefined;
  }

  for (const key in input) {
    if (key !== "$link") {
      return undefined;
    }
  }

  const { $link } = input;

  if (typeof $link !== "string") {
    return undefined;
  }

  if ($link.length === 0 || $link.length > 2048) {
    return undefined;
  }

  try {
    return parseCid($link);
  } catch {
    return undefined;
  }
}

export function encodeLexLink(cid: Cid): JsonValue {
  return { $link: cid.toString() };
}
