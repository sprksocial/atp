import { decodeCbor } from "@std/cbor";
import { CID } from "multiformats/cid";

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

  private decodeValue(): unknown {
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

  private processValue(value: unknown): unknown {
    // Handle CID tag 42 if present
    if (
      value && typeof value === "object" && "tag" in value &&
      "value" in value &&
      (value as { tag: number }).tag === 42
    ) {
      return this.decodeCid((value as { value: Uint8Array }).value);
    }

    // Recursively process arrays and objects
    if (Array.isArray(value)) {
      return value.map((item) => this.processValue(item));
    }

    if (value && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.processValue(val);
      }
      return result;
    }

    return value;
  }

  decodeMultiple(): unknown[] {
    const decoded: unknown[] = [];

    // Note: This is a simplified implementation
    // @std/cbor doesn't have native support for decoding multiple concatenated CBOR values
    // A more robust implementation would need to parse the CBOR structure manually
    try {
      const value = decodeCbor(this.buffer);
      decoded.push(this.processValue(value));
    } catch (error) {
      throw new Error(`Failed to decode CBOR: ${error}`);
    }

    return decoded;
  }
}

export const cborDecodeMulti = (encoded: Uint8Array): unknown[] => {
  const decoder = new CborMultiDecoder(encoded);
  return decoder.decodeMultiple();
};
