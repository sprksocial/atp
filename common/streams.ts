import { concat } from "@atp/bytes";
import { flattenUint8Arrays } from "./util.ts";

export const forwardStreamErrors = (..._streams: ReadableStream[]) => {
  // Web Streams don't have the same error forwarding mechanism as streams
  // This is a no-op in the Web Streams world since error handling is done differently
};

export const cloneStream = (
  stream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> => {
  const [_stream1, stream2] = stream.tee();
  return stream2;
};

export const streamSize = async (
  stream: ReadableStream<Uint8Array>,
): Promise<number> => {
  let size = 0;
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  return size;
};

export const streamToBytes = async (
  stream: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>,
): Promise<Uint8Array> => {
  const chunks: Uint8Array[] = [];

  if (stream instanceof ReadableStream) {
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    for await (const chunk of stream) {
      if (chunk instanceof Uint8Array) {
        chunks.push(chunk);
      } else {
        throw new TypeError("expected Uint8Array");
      }
    }
  }

  return concat(chunks);
};

export const streamToBuffer = async (
  stream: AsyncIterable<Uint8Array>,
): Promise<Uint8Array> => {
  const arrays: Uint8Array[] = [];
  for await (const chunk of stream) {
    arrays.push(chunk);
  }
  return flattenUint8Arrays(arrays);
};

export const byteIterableToStream = (
  iter: AsyncIterable<Uint8Array>,
): ReadableStream<Uint8Array> => {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of iter) {
          controller.enqueue(chunk);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
};

export const bytesToStream = (
  bytes: Uint8Array,
): ReadableStream<Uint8Array> => {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
};

export class MaxSizeChecker extends TransformStream<Uint8Array, Uint8Array> {
  totalSize = 0;

  constructor(
    public maxSize: number,
    public createError: () => Error,
  ) {
    super({
      transform: (chunk, controller) => {
        this.totalSize += chunk.byteLength;
        if (this.totalSize > this.maxSize) {
          controller.error(this.createError());
        } else {
          controller.enqueue(chunk);
        }
      },
    });
  }
}

export function decodeStream(
  stream: ReadableStream<Uint8Array>,
  contentEncoding?: string | string[],
): ReadableStream<Uint8Array>;
export function decodeStream(
  stream: AsyncIterable<Uint8Array>,
  contentEncoding?: string | string[],
): AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>;
export function decodeStream(
  stream: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
  contentEncoding?: string | string[],
): ReadableStream<Uint8Array> | AsyncIterable<Uint8Array> {
  const decoders = createDecoders(contentEncoding);
  if (decoders.length === 0) return stream;

  let result: ReadableStream<Uint8Array>;

  if (stream instanceof ReadableStream) {
    result = stream;
  } else {
    result = byteIterableToStream(stream);
  }

  // Chain the decoders together
  for (const decoder of decoders) {
    result = result.pipeThrough(decoder);
  }

  return result;
}

/**
 * Create a series of decoding streams based on the content-encoding header. The
 * resulting streams should be piped together to decode the content.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc9110#section-8.4.1}
 */
export function createDecoders(
  contentEncoding?: string | string[],
): TransformStream<Uint8Array, Uint8Array>[] {
  const decoders: TransformStream<Uint8Array, Uint8Array>[] = [];

  if (contentEncoding?.length) {
    const encodings: string[] = Array.isArray(contentEncoding)
      ? contentEncoding.flatMap(commaSplit)
      : contentEncoding.split(",");
    for (const encoding of encodings) {
      const normalizedEncoding = normalizeEncoding(encoding);

      // @NOTE
      // > The default (identity) encoding [...] is used only in the
      // > Accept-Encoding header, and SHOULD NOT be used in the
      // > Content-Encoding header.
      if (normalizedEncoding === "identity") continue;

      decoders.push(createDecoder(normalizedEncoding));
    }
  }

  return decoders.reverse();
}

function commaSplit(header: string): string[] {
  return header.split(",");
}

function normalizeEncoding(encoding: string) {
  // https://www.rfc-editor.org/rfc/rfc7231#section-3.1.2.1
  // > All content-coding values are case-insensitive...
  return encoding.trim().toLowerCase();
}

function createDecoder(
  normalizedEncoding: string,
): TransformStream<Uint8Array, Uint8Array> {
  switch (normalizedEncoding) {
    // https://www.rfc-editor.org/rfc/rfc9112.html#section-7.2
    case "gzip":
    case "x-gzip":
      return new DecompressionStream("gzip") as TransformStream<
        Uint8Array,
        Uint8Array
      >;
    case "deflate":
      return new DecompressionStream("deflate") as TransformStream<
        Uint8Array,
        Uint8Array
      >;
    case "br":
      throw new TypeError(
        `Brotli decompression is not supported in this Deno implementation`,
      );
    case "identity":
      return new TransformStream(); // Pass-through
    default:
      throw new TypeError(
        `Unsupported content-encoding: "${normalizedEncoding}"`,
      );
  }
}
