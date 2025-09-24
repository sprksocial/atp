import { fromString, type SupportedEncodings, toString } from "@atp/ui8";

export const multibaseToBytes = (mb: string): Uint8Array => {
  const base = mb[0];
  const key = mb.slice(1);
  switch (base) {
    case "f":
      return fromString(key, "base16");
    case "F":
      return fromString(key, "base16upper");
    case "b":
      return fromString(key, "base32");
    case "B":
      return fromString(key, "base32upper");
    case "z":
      return fromString(key, "base58btc");
    case "m":
      return fromString(key, "base64");
    case "u":
      return fromString(key, "base64url");
    case "U":
      return fromString(key, "base64urlpad");
    default:
      throw new Error(`Unsupported multibase: :${mb}`);
  }
};

export const bytesToMultibase = (
  mb: Uint8Array,
  encoding: SupportedEncodings,
): string => {
  switch (encoding) {
    case "base16":
      return "f" + toString(mb, encoding);
    case "base16upper":
      return "F" + toString(mb, encoding);
    case "base32":
      return "b" + toString(mb, encoding);
    case "base32upper":
      return "B" + toString(mb, encoding);
    case "base58btc":
      return "z" + toString(mb, encoding);
    case "base64":
      return "m" + toString(mb, encoding);
    case "base64url":
      return "u" + toString(mb, encoding);
    case "base64urlpad":
      return "U" + toString(mb, encoding);
    default:
      throw new Error(`Unsupported multibase: :${encoding}`);
  }
};
