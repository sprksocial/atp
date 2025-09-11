import { decodeCbor } from "@std/cbor";
import { CID } from "multiformats/cid";

// Define the possible CBOR value types
export type CborPrimitive =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined;
export type CborArray = CborValue[];
export type CborObject = { [key: string]: CborValue };
export type CborValue =
  | CborPrimitive
  | CborArray
  | CborObject
  | CID
  | Uint8Array;

// Type for CBOR tag structure
interface CborTag<T = unknown> {
  tag: number;
  value: T;
}

// Type guard for CBOR tags
function isCborTag(value: unknown): value is CborTag {
  return (
    value !== null &&
    typeof value === "object" &&
    "tag" in value &&
    "value" in value &&
    typeof (value as CborTag).tag === "number"
  );
}

// Type guard for CID tag specifically
function isCidTag(value: unknown): value is CborTag<Uint8Array> {
  return isCborTag(value) && value.tag === 42 &&
    value.value instanceof Uint8Array;
}

// Custom CBOR decoder that handles CIDs and multiple values
class CborMultiDecoder {
  private buffer: Uint8Array;
  private position: number = 0;

  constructor(encoded: Uint8Array) {
    this.buffer = encoded;
  }

  private decodeCid(bytes: Uint8Array): CID {
    if (bytes[0] !== 0) {
      throw new Error("Invalid CID for CBOR tag 42; expected leading 0x00");
    }
    return CID.decode(bytes.subarray(1)); // ignore leading 0x00
  }

  private decodeValue(): CborValue {
    // Find the next complete CBOR value
    const remaining = this.buffer.subarray(this.position);

    // Use @std/cbor to decode the next value
    // Note: @std/cbor doesn't have built-in support for decoding multiple values
    // or custom tags like cborx, so we need to handle this manually

    // For now, we'll decode the entire remaining buffer and handle CID tags manually
    const decoded = decodeCbor(remaining);

    // Update position to end of buffer (simplified approach)
    this.position = this.buffer.length;

    return this.processValue(decoded);
  }

  private processValue(value: unknown): CborValue {
    // Handle CID tag 42 if present
    if (isCidTag(value)) {
      return this.decodeCid(value.value);
    }

    // Handle other CBOR tags (convert to regular values for now)
    if (isCborTag(value)) {
      return this.processValue(value.value);
    }

    // Recursively process arrays
    if (Array.isArray(value)) {
      return value.map((item): CborValue => this.processValue(item));
    }

    // Recursively process objects
    if (
      value !== null && typeof value === "object" &&
      !(value instanceof Uint8Array)
    ) {
      const result: CborObject = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.processValue(val);
      }
      return result;
    }

    // Handle primitives and Uint8Array
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "bigint" ||
      typeof value === "boolean" ||
      value === null ||
      value === undefined ||
      value instanceof Uint8Array
    ) {
      return value;
    }

    // Fallback for any other types - shouldn't happen with valid CBOR
    throw new Error(`Unsupported CBOR value type: ${typeof value}`);
  }

  decodeMultiple(): CborValue[] {
    const decoded: CborValue[] = [];
    this.position = 0;

    // Parse CBOR values manually to handle concatenated data
    while (this.position < this.buffer.length) {
      try {
        const remaining = this.buffer.subarray(this.position);
        if (remaining.length === 0) break;

        // Parse the next CBOR value and track how many bytes we consumed
        const startPos = this.position;
        const value = this.parseNextCborValue();
        decoded.push(this.processValue(value));

        // If position didn't advance, we're stuck - break to avoid infinite loop
        if (this.position === startPos) {
          break;
        }
      } catch (error) {
        throw new Error(`Failed to decode CBOR: ${error}`);
      }
    }

    return decoded;
  }

  private parseNextCborValue(): unknown {
    if (this.position >= this.buffer.length) {
      throw new Error("Unexpected end of CBOR data");
    }

    const _startPos = this.position;
    const byte = this.buffer[this.position];
    const majorType = (byte >> 5) & 0x07;
    const additionalInfo = byte & 0x1f;

    this.position++;

    switch (majorType) {
      case 0: { // Unsigned integer
        return this.readUnsignedInt(additionalInfo);
      }
      case 1: { // Negative integer
        const unsignedInt = this.readUnsignedInt(additionalInfo);
        if (typeof unsignedInt === "bigint") {
          const negativeValue = -1n - unsignedInt;
          // Convert to number if within safe integer range
          if (negativeValue >= BigInt(Number.MIN_SAFE_INTEGER)) {
            return Number(negativeValue);
          }
          return negativeValue;
        }
        return -1 - unsignedInt;
      }
      case 2: { // Byte string
        return this.readByteString(additionalInfo);
      }
      case 3: { // Text string
        return this.readTextString(additionalInfo);
      }
      case 4: { // Array
        return this.readArray(additionalInfo);
      }
      case 5: { // Map
        return this.readMap(additionalInfo);
      }
      case 6: { // Tag
        return this.readTag(additionalInfo);
      }
      case 7: { // Float/Simple/Break
        return this.readFloatOrSimple(additionalInfo);
      }
      default:
        throw new Error(`Unknown CBOR major type: ${majorType}`);
    }
  }

  private readUnsignedInt(additionalInfo: number): number | bigint {
    if (additionalInfo < 24) {
      return additionalInfo;
    } else if (additionalInfo === 24) {
      return this.readUint8();
    } else if (additionalInfo === 25) {
      return this.readUint16();
    } else if (additionalInfo === 26) {
      return this.readUint32();
    } else if (additionalInfo === 27) {
      const bigIntValue = this.readUint64();
      // Convert to number if within safe integer range
      if (bigIntValue <= BigInt(Number.MAX_SAFE_INTEGER)) {
        return Number(bigIntValue);
      }
      return bigIntValue;
    } else {
      throw new Error(
        `Invalid additional info for unsigned int: ${additionalInfo}`,
      );
    }
  }

  private readUint8(): number {
    if (this.position >= this.buffer.length) throw new Error("Unexpected end");
    return this.buffer[this.position++];
  }

  private readUint16(): number {
    if (this.position + 1 >= this.buffer.length) {
      throw new Error("Unexpected end");
    }
    const value = (this.buffer[this.position] << 8) |
      this.buffer[this.position + 1];
    this.position += 2;
    return value;
  }

  private readUint32(): number {
    if (this.position + 3 >= this.buffer.length) {
      throw new Error("Unexpected end");
    }
    const value = (this.buffer[this.position] << 24) |
      (this.buffer[this.position + 1] << 16) |
      (this.buffer[this.position + 2] << 8) |
      this.buffer[this.position + 3];
    this.position += 4;
    return value >>> 0; // Convert to unsigned
  }

  private readUint64(): bigint {
    if (this.position + 7 >= this.buffer.length) {
      throw new Error("Unexpected end");
    }
    let value = 0n;
    for (let i = 0; i < 8; i++) {
      value = (value << 8n) | BigInt(this.buffer[this.position + i]);
    }
    this.position += 8;
    return value;
  }

  private readByteString(additionalInfo: number): Uint8Array {
    const length = this.readUnsignedInt(additionalInfo);
    if (typeof length === "bigint") {
      throw new Error("Byte string too large");
    }
    const lengthNum = Number(length);
    if (this.position + lengthNum > this.buffer.length) {
      throw new Error("Unexpected end of byte string");
    }
    const result = this.buffer.subarray(
      this.position,
      this.position + lengthNum,
    );
    this.position += lengthNum;
    return result;
  }

  private readTextString(additionalInfo: number): string {
    const bytes = this.readByteString(additionalInfo);
    return new TextDecoder().decode(bytes);
  }

  private readArray(additionalInfo: number): unknown[] {
    const length = this.readUnsignedInt(additionalInfo);
    if (typeof length === "bigint") {
      throw new Error("Array too large");
    }
    const lengthNum = Number(length);
    const result: unknown[] = [];
    for (let i = 0; i < lengthNum; i++) {
      result.push(this.parseNextCborValue());
    }
    return result;
  }

  private readMap(additionalInfo: number): Record<string, unknown> {
    const length = this.readUnsignedInt(additionalInfo);
    if (typeof length === "bigint") {
      throw new Error("Map too large");
    }
    const lengthNum = Number(length);
    const result: Record<string, unknown> = {};
    for (let i = 0; i < lengthNum; i++) {
      const key = this.parseNextCborValue();
      const value = this.parseNextCborValue();
      if (typeof key !== "string") {
        throw new Error(`Map key must be string, got ${typeof key}`);
      }
      result[key] = value;
    }
    return result;
  }

  private readTag(additionalInfo: number): { tag: number; value: unknown } {
    const tag = this.readUnsignedInt(additionalInfo);
    const value = this.parseNextCborValue();
    return {
      tag: typeof tag === "bigint" ? Number(tag) : tag,
      value,
    };
  }

  private readFloatOrSimple(additionalInfo: number): unknown {
    if (additionalInfo < 20) {
      // Simple values 0-19 are unassigned
      throw new Error(`Unassigned simple value: ${additionalInfo}`);
    } else if (additionalInfo === 20) {
      return false;
    } else if (additionalInfo === 21) {
      return true;
    } else if (additionalInfo === 22) {
      return null;
    } else if (additionalInfo === 23) {
      return undefined;
    } else if (additionalInfo === 25) {
      // Half-precision float (16-bit)
      const value = this.readUint16();
      return this.decodeFloat16(value);
    } else if (additionalInfo === 26) {
      // Single-precision float (32-bit)
      const bytes = new Uint8Array(4);
      for (let i = 0; i < 4; i++) {
        bytes[i] = this.buffer[this.position + i];
      }
      this.position += 4;
      return new DataView(bytes.buffer).getFloat32(0, false);
    } else if (additionalInfo === 27) {
      // Double-precision float (64-bit)
      const bytes = new Uint8Array(8);
      for (let i = 0; i < 8; i++) {
        bytes[i] = this.buffer[this.position + i];
      }
      this.position += 8;
      return new DataView(bytes.buffer).getFloat64(0, false);
    } else {
      throw new Error(
        `Invalid additional info for float/simple: ${additionalInfo}`,
      );
    }
  }

  private decodeFloat16(value: number): number {
    const sign = (value & 0x8000) ? -1 : 1;
    const exponent = (value & 0x7c00) >> 10;
    const fraction = value & 0x03ff;

    if (exponent === 0) {
      return sign * Math.pow(2, -14) * (fraction / Math.pow(2, 10));
    } else if (exponent === 0x1f) {
      return fraction ? NaN : sign * Infinity;
    } else {
      return sign * Math.pow(2, exponent - 15) *
        (1 + fraction / Math.pow(2, 10));
    }
  }
}

// Generic version that allows callers to specify expected return type
export function cborDecodeMulti<T extends CborValue = CborValue>(
  encoded: Uint8Array,
): T[] {
  const decoder = new CborMultiDecoder(encoded);
  return decoder.decodeMultiple() as T[];
}

// Convenience function for decoding a single value
export function cborDecodeSingle<T extends CborValue = CborValue>(
  encoded: Uint8Array,
): T {
  const results = cborDecodeMulti<T>(encoded);
  if (results.length !== 1) {
    throw new Error(`Expected single value, got ${results.length} values`);
  }
  return results[0];
}

// Type-specific decoders for common use cases
export function cborDecodeMultiAsObjects(encoded: Uint8Array): CborObject[] {
  return cborDecodeMulti<CborObject>(encoded);
}

export function cborDecodeMultiAsArrays(encoded: Uint8Array): CborArray[] {
  return cborDecodeMulti<CborArray>(encoded);
}
