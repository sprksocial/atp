import bases, { type SupportedEncodings } from "./util.ts";

export type { SupportedEncodings };

/**
 * Create a `Uint8Array` from the passed string
 *
 * Supports `utf8`, `utf-8`, `hex`, and any encoding supported by the multiformats module.
 *
 * Also `ascii` which is similar to node's 'binary' encoding.
 */
export function fromString(
  string: string,
  encoding: SupportedEncodings = "utf8",
): Uint8Array {
  const base = bases[encoding];

  if (base == null) {
    throw new Error(`Unsupported encoding "${encoding}"`);
  }

  // add multibase prefix
  return base.decoder.decode(`${base.prefix}${string}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
}

/**
 * Turns a `Uint8Array` into a string.
 *
 * Supports `utf8`, `utf-8` and any encoding supported by the multibase module.
 *
 * Also `ascii` which is similar to node's 'binary' encoding.
 */
export function toString(
  array: Uint8Array,
  encoding: SupportedEncodings = "utf8",
): string {
  const base = bases[encoding];

  if (base == null) {
    throw new Error(`Unsupported encoding "${encoding}"`);
  }

  // strip multibase prefix
  return base.encoder.encode(array).substring(1);
}
