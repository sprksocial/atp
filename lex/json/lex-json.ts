import {
  type BlobRef,
  type Cid,
  isCid,
  type LexArray,
  type LexMap,
  type LexValue,
} from "../data/mod.ts";
import { parseTypedBlobRef } from "./blob.ts";
import { encodeLexBytes, parseLexBytes } from "./bytes.ts";
import type { JsonObject, JsonValue } from "./json.ts";
import { encodeLexLink, parseLexLink } from "./link.ts";

const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

export type LexParseOptions = {
  strict?: boolean;
};

export function lexStringify(input: LexValue): string {
  return JSON.stringify(lexToJson(input));
}

export function lexParse<T extends LexValue = LexValue>(
  input: string,
  options: LexParseOptions = { strict: false },
): T {
  return jsonToLex(JSON.parse(input), options) as T;
}

export function lexParseJsonBytes(
  bytes: Uint8Array,
  options?: LexParseOptions,
): LexValue {
  return lexParse(TEXT_DECODER.decode(bytes), options);
}

export function jsonToLex(
  value: JsonValue,
  options: LexParseOptions = { strict: false },
): LexValue {
  switch (typeof value) {
    case "object": {
      if (value === null) return null;
      if (Array.isArray(value)) return jsonArrayToLex(value, options);
      return parseSpecialJsonObject(value, options) ??
        jsonObjectToLexMap(value, options);
    }
    case "number":
      if (Number.isSafeInteger(value)) return value;
      if (options.strict === false) return value;
      throw new TypeError(`Invalid non-integer number: ${value}`);
    case "boolean":
    case "string":
      return value;
    default:
      throw new TypeError(`Invalid JSON value: ${typeof value}`);
  }
}

function jsonArrayToLex(
  input: JsonValue[],
  options: LexParseOptions,
): LexValue[] {
  let copy: LexValue[] | undefined;

  for (let i = 0; i < input.length; i++) {
    const inputItem = input[i];
    const item = jsonToLex(inputItem, options);
    if (item !== inputItem) {
      copy ??= Array.from(input);
      copy[i] = item;
    }
  }

  return copy ?? input;
}

function jsonObjectToLexMap(
  input: JsonObject,
  options: LexParseOptions,
): LexMap {
  let copy: LexMap | undefined;

  for (const [key, jsonValue] of Object.entries(input)) {
    if (key === "__proto__") {
      throw new TypeError("Invalid key: __proto__");
    }

    if (jsonValue === undefined) {
      copy ??= { ...input };
      delete copy[key];
      continue;
    }

    const value = jsonToLex(jsonValue, options);
    if (value !== jsonValue) {
      copy ??= { ...input };
      copy[key] = value;
    }
  }

  return copy ?? input;
}

export function lexToJson(value: LexValue): JsonValue {
  switch (typeof value) {
    case "object":
      if (value === null) {
        return value;
      } else if (Array.isArray(value)) {
        return lexArrayToJson(value);
      } else if (isCid(value)) {
        return encodeLexLink(value);
      } else if (ArrayBuffer.isView(value)) {
        return encodeLexBytes(
          new Uint8Array(
            value.buffer,
            value.byteOffset,
            value.byteLength,
          ),
        );
      } else {
        return encodeLexMap(value);
      }
    case "boolean":
    case "string":
    case "number":
      return value;
    default:
      throw new TypeError(`Invalid Lex value: ${typeof value}`);
  }
}

function lexArrayToJson(input: LexArray): JsonValue[] {
  let copy: JsonValue[] | undefined;

  for (let i = 0; i < input.length; i++) {
    const inputItem = input[i];
    const item = lexToJson(inputItem);
    if (item !== inputItem) {
      copy ??= Array.from(input) as JsonValue[];
      copy[i] = item;
    }
  }

  return copy ?? (input as JsonValue[]);
}

function encodeLexMap(input: LexMap): JsonObject {
  let copy: JsonObject | undefined;

  for (const [key, lexValue] of Object.entries(input)) {
    if (key === "__proto__") {
      throw new TypeError("Invalid key: __proto__");
    }

    if (lexValue === undefined) {
      copy ??= { ...input } as JsonObject;
      delete copy[key];
      continue;
    }

    const jsonValue = lexToJson(lexValue);
    if (jsonValue !== lexValue) {
      copy ??= { ...input } as JsonObject;
      copy[key] = jsonValue;
    }
  }

  return copy ?? (input as JsonObject);
}

export function parseSpecialJsonObject(
  input: LexMap,
  options: LexParseOptions,
): Cid | Uint8Array | BlobRef | undefined {
  if (input.$link !== undefined) {
    const cid = parseLexLink(input);
    if (cid) return cid;
    if (options.strict) throw new TypeError("Invalid $link object");
  } else if (input.$bytes !== undefined) {
    const bytes = parseLexBytes(input);
    if (bytes) return bytes;
    if (options.strict) throw new TypeError("Invalid $bytes object");
  } else if (input.$type !== undefined) {
    if (options.strict) {
      if (input.$type === "blob") {
        const blob = parseTypedBlobRef(input, options);
        if (blob) return blob;
        throw new TypeError("Invalid blob object");
      } else if (typeof input.$type !== "string") {
        throw new TypeError(`Invalid $type property (${typeof input.$type})`);
      } else if (input.$type.length === 0) {
        throw new TypeError("Empty $type property");
      }
    }
  }

  return undefined;
}
