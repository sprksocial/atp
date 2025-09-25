import { encodeCbor } from "@std/cbor";
import * as uint8arrays from "@atp/bytes";
import { ErrorFrame, Frame, FrameType, MessageFrame } from "../mod.ts";
import { assertEquals, assertThrows } from "@std/assert";

Deno.test("creates and parses message frame", () => {
  const messageFrame = new MessageFrame(
    { a: "b", c: [1, 2, 3] },
    { type: "#d" },
  );

  assertEquals(messageFrame.header, {
    op: FrameType.Message,
    t: "#d",
  });
  assertEquals(messageFrame.op, FrameType.Message);
  assertEquals(messageFrame.type, "#d");
  assertEquals(messageFrame.body, { a: "b", c: [1, 2, 3] });

  const bytes = messageFrame.toBytes();
  assertEquals(
    uint8arrays.equals(
      bytes,
      new Uint8Array([
        /*header*/ 162,
        97,
        116,
        98,
        35,
        100,
        98,
        111,
        112,
        1,
        /*body*/ 162,
        97,
        97,
        97,
        98,
        97,
        99,
        131,
        1,
        2,
        3,
      ]),
    ),
    true,
  );

  const parsedFrame = Frame.fromBytes(bytes);
  if (!(parsedFrame instanceof MessageFrame)) {
    throw new Error("Did not parse as message frame");
  }

  assertEquals(parsedFrame.header, messageFrame.header);
  assertEquals(parsedFrame.op, messageFrame.op);
  assertEquals(parsedFrame.type, messageFrame.type);
  assertEquals(parsedFrame.body, messageFrame.body);
});

Deno.test("creates and parses error frame", () => {
  const errorFrame = new ErrorFrame({
    error: "BigOops",
    message: "Something went awry",
  });

  assertEquals(errorFrame.header, { op: FrameType.Error });
  assertEquals(errorFrame.op, FrameType.Error);
  assertEquals(errorFrame.code, "BigOops");
  assertEquals(errorFrame.message, "Something went awry");
  assertEquals(errorFrame.body, {
    error: "BigOops",
    message: "Something went awry",
  });

  const bytes = errorFrame.toBytes();
  assertEquals(
    uint8arrays.equals(
      bytes,
      new Uint8Array([
        /*header*/ 161,
        98,
        111,
        112,
        32,
        /*body*/ 162,
        101,
        101,
        114,
        114,
        111,
        114,
        103,
        66,
        105,
        103,
        79,
        111,
        112,
        115,
        103,
        109,
        101,
        115,
        115,
        97,
        103,
        101,
        115,
        83,
        111,
        109,
        101,
        116,
        104,
        105,
        110,
        103,
        32,
        119,
        101,
        110,
        116,
        32,
        97,
        119,
        114,
        121,
      ]),
    ),
    true,
  );

  const parsedFrame = Frame.fromBytes(bytes);
  if (!(parsedFrame instanceof ErrorFrame)) {
    throw new Error("Did not parse as error frame");
  }

  assertEquals(parsedFrame.header, errorFrame.header);
  assertEquals(parsedFrame.op, errorFrame.op);
  assertEquals(parsedFrame.code, errorFrame.code);
  assertEquals(parsedFrame.message, errorFrame.message);
  assertEquals(parsedFrame.body, errorFrame.body);
});

Deno.test("parsing fails when frame is not CBOR", () => {
  const bytes = new Uint8Array(new TextEncoder().encode("some utf8 bytes"));
  const emptyBytes = new Uint8Array(0);
  assertThrows(
    () => Frame.fromBytes(bytes),
    Error,
    "Unexpected end of CBOR data",
  );
  assertThrows(
    () => Frame.fromBytes(emptyBytes),
    Error,
    "Unexpected end of CBOR data",
  );
});

Deno.test("parsing fails when frame header is malformed", () => {
  const bytes = uint8arrays.concat([
    encodeCbor({ op: -2 }), // Unknown op
    encodeCbor({ a: "b", c: [1, 2, 3] }),
  ]);

  assertThrows(
    () => Frame.fromBytes(bytes),
    Error,
    "Invalid frame header:",
  );
});

Deno.test("parsing fails when frame is missing body", () => {
  const messageFrame = new MessageFrame(
    { a: "b", c: [1, 2, 3] },
    { type: "#d" },
  );

  const headerBytes = encodeCbor(messageFrame.header);

  assertThrows(
    () => Frame.fromBytes(headerBytes),
    Error,
    "Missing frame body",
  );
});

Deno.test("parsing fails when frame has too many data items", () => {
  const messageFrame = new MessageFrame(
    { a: "b", c: [1, 2, 3] },
    { type: "#d" },
  );

  const bytes = uint8arrays.concat([
    messageFrame.toBytes(),
    encodeCbor({ d: "e", f: [4, 5, 6] }),
  ]);

  assertThrows(
    () => Frame.fromBytes(bytes),
    Error,
    "Too many CBOR data items in frame",
  );
});

Deno.test("parsing fails when error frame has invalid body", () => {
  const errorFrame = new ErrorFrame({ error: "BadOops" });

  const bytes = uint8arrays.concat([
    encodeCbor(errorFrame.header),
    encodeCbor({ blah: 1 }),
  ]);

  assertThrows(
    () => Frame.fromBytes(bytes),
    Error,
    "Invalid error frame body:",
  );
});
