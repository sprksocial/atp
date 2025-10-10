import { bases } from "multiformats/basics";
import type { MultibaseCodec } from "multiformats";
import { allocUnsafe } from "./alloc.ts";

function createCodec(
  name: string,
  prefix: string,
  encode: (buf: Uint8Array) => string,
  decode: (str: string) => Uint8Array,
): MultibaseCodec<string> {
  return {
    name,
    prefix,
    encoder: {
      name,
      prefix,
      encode,
    },
    decoder: {
      decode,
    },
  };
}

const string = createCodec("utf8", "u", (buf) => {
  const decoder = new TextDecoder("utf8");
  return "u" + decoder.decode(buf);
}, (str) => {
  const encoder = new TextEncoder();
  return encoder.encode(str.substring(1));
});

const ascii = createCodec("ascii", "a", (buf) => {
  let string = "a";

  for (let i = 0; i < buf.length; i++) {
    string += String.fromCharCode(buf[i]);
  }
  return string;
}, (str) => {
  str = str.substring(1);
  const buf = allocUnsafe(str.length);

  for (let i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i);
  }

  return buf;
});

/** Supported base encodings */
export type SupportedEncodings =
  | "utf8"
  | "utf-8"
  | "hex"
  | "latin1"
  | "ascii"
  | "binary"
  | keyof typeof bases;

const BASES: Record<SupportedEncodings, MultibaseCodec<string>> = {
  utf8: string,
  "utf-8": string,
  hex: bases.base16,
  latin1: ascii,
  ascii,
  binary: ascii,

  ...bases,
};

/** Supported base encoding multibase codecs */
export default BASES;

/**
 * To guarantee Uint8Array semantics, convert nodejs Buffers
 * into vanilla Uint8Arrays
 */
export function asUint8Array(buf: Uint8Array): Uint8Array {
  return buf;
}
