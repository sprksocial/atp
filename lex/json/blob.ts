import type { BlobRef, LexMap } from "../data/mod.ts";
import { isBlobRef } from "../data/mod.ts";
import { parseLexLink } from "./link.ts";

export function parseTypedBlobRef(
  input: LexMap,
  options?: { strict?: boolean },
): BlobRef | undefined {
  if (input.$type !== "blob") {
    return undefined;
  }

  const ref = input.ref;
  if (!ref || typeof ref !== "object") {
    return undefined;
  }

  if ("$link" in ref) {
    const cid = parseLexLink(ref);
    if (!cid) {
      return undefined;
    }

    const blob = { ...input, ref: cid };
    if (isBlobRef(blob, options)) {
      return blob;
    }
  }

  if (isBlobRef(input, options)) {
    return input;
  }

  return undefined;
}
