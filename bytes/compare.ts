/**
 * Can be used with Array.sort to sort and array with Uint8Array entries
 */
export function compare(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] < b[i]) {
      return -1;
    }

    if (a[i] > b[i]) {
      return 1;
    }
  }

  if (a.byteLength > b.byteLength) {
    return 1;
  }

  if (a.byteLength < b.byteLength) {
    return -1;
  }

  return 0;
}

/**
 * Returns true if the two passed Uint8Arrays have the same content
 */
export function equals(a: Uint8Array, b: Uint8Array): boolean {
  if (a === b) {
    return true;
  }

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

/**
 * Compares two Uint8Arrays representing two xor distances. Returns `-1` if `a`
 * is a lower distance, `1` if `b` is a lower distance or `0` if the distances
 * are equal.
 */
export function xorCompare(a: Uint8Array, b: Uint8Array): -1 | 0 | 1 {
  if (a.byteLength !== b.byteLength) {
    throw new Error("Inputs should have the same length");
  }

  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] === b[i]) {
      continue;
    }

    return a[i] < b[i] ? -1 : 1;
  }

  return 0;
}
