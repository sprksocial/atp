import { fromString, toString } from "@atp/bytes";
import type { JsonValue } from "./json.ts";

export function parseLexBytes(
  input?: Record<string, unknown>,
): Uint8Array | undefined {
  if (!input || !("$bytes" in input)) {
    return undefined;
  }

  for (const key in input) {
    if (key !== "$bytes") {
      return undefined;
    }
  }

  if (typeof input.$bytes !== "string") {
    return undefined;
  }

  try {
    return fromString(input.$bytes, "base64");
  } catch {
    return undefined;
  }
}

export function encodeLexBytes(bytes: Uint8Array): JsonValue {
  return { $bytes: toString(bytes, "base64") };
}
