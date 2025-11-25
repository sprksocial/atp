import { CID, isCid } from "./cid.ts";
import { isPlainObject } from "./object.ts";
import { ui8Equals } from "./uint8array.ts";

// @NOTE BlobRef is just a special case of LexMap.

export type LexScalar = number | string | boolean | null | CID | Uint8Array;
export type LexValue = LexScalar | LexValue[] | { [_ in string]?: LexValue };
export type LexMap = { [_ in string]?: LexValue };
export type LexArray = LexValue[];

export function isLexMap(value: unknown): value is LexMap {
  if (!isPlainObject(value)) return false;
  for (const key in value) {
    if (!isLexValue(value[key])) return false;
  }
  return true;
}

export function isLexArray(value: unknown): value is LexArray {
  if (!Array.isArray(value)) return false;
  for (let i = 0; i < value.length; i++) {
    if (!isLexValue(value[i])) return false;
  }
  return true;
}

export function isLexScalar(value: unknown): value is LexScalar {
  switch (typeof value) {
    case "object":
      if (value === null) return true;
      return value instanceof Uint8Array || isCid(value);
    case "string":
    case "boolean":
      return true;
    case "number":
      if (Number.isInteger(value)) return true;
      throw new TypeError(`Invalid Lex value: ${value}`);
    default:
      throw new TypeError(`Invalid Lex value: ${typeof value}`);
  }
}

export function isLexValue(value: unknown): value is LexValue {
  switch (typeof value) {
    case "number":
      if (!Number.isInteger(value)) return false;
    // fallthrough
    case "string":
    case "boolean":
      return true;
    case "object":
      if (value === null) return true;
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (!isLexValue(value[i])) return false;
        }
        return true;
      }
      if (isPlainObject(value)) {
        for (const key in value) {
          if (!isLexValue(value[key])) return false;
        }
        return true;
      }
      if (value instanceof Uint8Array) return true;
      if (isCid(value)) return true;
    // fallthrough
    default:
      return false;
  }
}

export type TypedLexMap = LexMap & { $type: string };
export function isTypedLexMap(value: LexValue): value is TypedLexMap {
  return (
    isLexMap(value) && typeof value.$type === "string" && value.$type.length > 0
  );
}

export function lexEquals(a: LexValue, b: LexValue): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (
    a == null ||
    b == null ||
    typeof a !== "object" ||
    typeof b !== "object"
  ) {
    return false;
  }

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!lexEquals(a[i], b[i])) {
        return false;
      }
    }
    return true;
  } else if (Array.isArray(b)) {
    return false;
  }

  if (ArrayBuffer.isView(a)) {
    if (!ArrayBuffer.isView(b)) return false;
    return ui8Equals(a as Uint8Array, b as Uint8Array);
  } else if (ArrayBuffer.isView(b)) {
    return false;
  }

  if (isCid(a)) {
    // @NOTE CID.equals returns its argument when it is falsy (e.g. null or
    // undefined) so we need to explicitly check that the output is "true".
    return CID.asCID(a)!.equals(CID.asCID(b)) === true;
  } else if (isCid(b)) {
    return false;
  }

  if (!isPlainObject(a) || !isPlainObject(b)) {
    // Foolproof (should never happen)
    throw new TypeError(
      "Invalid LexValue (expected CID, Uint8Array, or LexMap)",
    );
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    const aVal = a[key];
    const bVal = b[key];

    // Needed because of the optional index signature in the Lex object type
    // though, in practice, aVal should never be undefined here.
    if (aVal === undefined) {
      if (bVal === undefined && bKeys.includes(key)) continue;
      return false;
    } else if (bVal === undefined) {
      return false;
    }

    if (!lexEquals(aVal, bVal)) {
      return false;
    }
  }

  return true;
}
