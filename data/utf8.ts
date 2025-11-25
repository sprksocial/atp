const segmenter = new Intl.Segmenter();

export function graphemeLen(str: string): number {
  let length = 0;
  for (const _ of segmenter.segment(str)) length++;
  return length;
}

export function utf8Len(string: string): number {
  // similar to TextEncoder's implementation of UTF-8 encoding.
  // However, using TextEncoder to get the byte length is slower
  // as it requires allocating a new Uint8Array and copying data:

  // return new TextEncoder().encode(string).byteLength

  // The base length is the string length (all ASCII)
  let len = string.length;
  let code: number;

  // The loop calculates the number of additional bytes needed for
  // non-ASCII characters
  for (let i = 0; i < string.length; i += 1) {
    code = string.charCodeAt(i);

    if (code <= 0x7f) {
      // ASCII, 1 byte
    } else if (code <= 0x7ff) {
      // 2 bytes char
      len += 1;
    } else {
      // 3 bytes char
      len += 2;
      // If the current char is a high surrogate, and the next char is a low
      // surrogate, skip the next char as the total is a 4 bytes char
      // (represented as a surrogate pair in UTF-16) and was already accounted
      // for.
      if (code >= 0xd800 && code <= 0xdbff) {
        code = string.charCodeAt(i + 1);
        if (code >= 0xdc00 && code <= 0xdfff) {
          i++;
        }
      }
    }
  }
  return len;
}
