import { assert, assertEquals, assertRejects } from "jsr:@std/assert";
import * as streams from "../streams.ts";

Deno.test("forwardStreamErrors - is a no-op in Web Streams", () => {
  const streamA = new ReadableStream();
  const streamB = new ReadableStream();

  // forwardStreamErrors is a no-op in Web Streams, so we just test it doesn't throw
  streams.forwardStreamErrors(streamA, streamB);

  // No assertion needed - just testing it doesn't throw
  assert(true);
});

Deno.test("cloneStream - should clone stream", async () => {
  const data = new Uint8Array([102, 111, 111]); // "foo" as bytes
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });

  const cloned = streams.cloneStream(stream);

  const chunks: Uint8Array[] = [];
  const reader = cloned.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  assertEquals(chunks.length, 1);
  assertEquals(chunks[0], data);
});

Deno.test("streamSize - reads entire stream and computes size", async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([102])); // "f"
      controller.enqueue(new Uint8Array([111])); // "o"
      controller.enqueue(new Uint8Array([111])); // "o"
      controller.close();
    },
  });

  const size = await streams.streamSize(stream);
  assertEquals(size, 3);
});

Deno.test("streamSize - returns 0 for empty streams", async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.close();
    },
  });

  const size = await streams.streamSize(stream);
  assertEquals(size, 0);
});

Deno.test("streamToBuffer - converts stream to buffer", async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([102, 111, 111])); // "foo"
      controller.close();
    },
  });

  const buffer = await streams.streamToBuffer(stream);
  const bytes = new Uint8Array(buffer.bytes());

  assertEquals(bytes[0], "f".charCodeAt(0));
  assertEquals(bytes[1], "o".charCodeAt(0));
  assertEquals(bytes[2], "o".charCodeAt(0));
  assertEquals(bytes.length, 3);
});

Deno.test("streamToBuffer - converts async iterable to buffer", async () => {
  const iterable = (async function* () {
    yield new Uint8Array([98]); // "b"
    yield new Uint8Array([97]); // "a"
    yield new Uint8Array([114]); // "r"
  })();

  const buffer = await streams.streamToBuffer(iterable);
  const bytes = new Uint8Array(buffer.bytes());

  assertEquals(bytes[0], "b".charCodeAt(0));
  assertEquals(bytes[1], "a".charCodeAt(0));
  assertEquals(bytes[2], "r".charCodeAt(0));
  assertEquals(bytes.length, 3);
});

Deno.test("streamToBuffer - throws error for non Uint8Array chunks", async () => {
  const iterable = (async function* () {
    yield new Uint8Array([98]); // "b"
    yield new Uint8Array([97]); // "a"
    yield "r"; // This should cause an error
  })();

  await assertRejects(
    () => streams.streamToBuffer(iterable as AsyncIterable<Uint8Array>),
    TypeError,
    "expected Uint8Array",
  );
});

Deno.test("byteIterableToStream - converts byte iterable to stream", async () => {
  const iterable: AsyncIterable<Uint8Array> = {
    async *[Symbol.asyncIterator]() {
      yield new Uint8Array([0xa, 0xb]);
    },
  };

  const stream = streams.byteIterableToStream(iterable);
  const reader = stream.getReader();

  try {
    const { done, value } = await reader.read();
    assertEquals(done, false);
    assertEquals(value![0], 0xa);
    assertEquals(value![1], 0xb);

    const { done: done2 } = await reader.read();
    assertEquals(done2, true);
  } finally {
    reader.releaseLock();
  }
});

Deno.test("bytesToStream - converts byte array to readable stream", async () => {
  const bytes = new Uint8Array([0xa, 0xb]);
  const stream = streams.bytesToStream(bytes);
  const reader = stream.getReader();

  try {
    const { done, value } = await reader.read();
    assertEquals(done, false);
    assertEquals(value![0], 0xa);
    assertEquals(value![1], 0xb);

    const { done: done2 } = await reader.read();
    assertEquals(done2, true);
  } finally {
    reader.releaseLock();
  }
});

Deno.test("MaxSizeChecker - destroys once max size is met", async () => {
  const err = new Error("foo");
  const checker = new streams.MaxSizeChecker(1, () => err);
  let lastError: Error | undefined;

  const sourceStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([0xa]));
      controller.enqueue(new Uint8Array([0xb]));
      controller.close();
    },
  });

  const outStream = sourceStream.pipeThrough(checker);
  const reader = outStream.getReader();

  assertEquals(checker.totalSize, 0);

  try {
    // Try to read chunks - should error on second chunk due to size limit
    await reader.read(); // First chunk (size 1) - should be ok
    await reader.read(); // Second chunk (total size 2) - should error
  } catch (error) {
    lastError = error as Error;
  } finally {
    reader.releaseLock();
  }

  assertEquals(checker.totalSize, 2);
  assertEquals(lastError, err);
});
