/**
 * Coerces various binary data representations into a Uint8Array.
 *
 * @return `undefined` if the input could not be coerced into a {@link Uint8Array}.
 */
export function asUint8Array(input: unknown): Uint8Array | undefined {
  if (input instanceof Uint8Array) {
    return input;
  }

  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(
      input.buffer,
      input.byteOffset,
      input.byteLength / Uint8Array.BYTES_PER_ELEMENT,
    );
  }

  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  return undefined;
}

export function ui8Equals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}
