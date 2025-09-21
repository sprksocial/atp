import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { TID } from "../tid.ts";

Deno.test("creates a new TID", () => {
  const tid = TID.next();
  const str = tid.toString();
  assertEquals(typeof str, "string");
  assertEquals(str.length, 13);
});

Deno.test("parses a TID", () => {
  const tid = TID.next();
  const str = tid.toString();
  const parsed = TID.fromStr(str);
  assertEquals(parsed.timestamp(), tid.timestamp());
  assertEquals(parsed.clockid(), tid.clockid());
});

Deno.test("throws if invalid tid passed", () => {
  assertThrows(() => new TID(""), "Poorly formatted TID: 0 length");
});

Deno.test("nextStr returns next tid as a string", () => {
  const str = TID.nextStr();
  assertEquals(typeof str, "string");
  assertEquals(str.length, 13);
});

Deno.test("nextStr returns a next tid larger than a provided prev", () => {
  const prev = TID.fromTime((Date.now() + 5000) * 1000, 0).toString();
  const str = TID.nextStr(prev);
  assert(str > prev);
});

Deno.test("newestFirst sorts tids newest first", () => {
  const oldest = TID.next();
  const newest = TID.next();

  const tids = [oldest, newest];

  tids.sort(TID.newestFirst);

  assertEquals(tids, [newest, oldest]);
});

Deno.test("oldestFirst sorts tids oldest first", () => {
  const oldest = TID.next();
  const newest = TID.next();

  const tids = [newest, oldest];

  tids.sort(TID.oldestFirst);

  assertEquals(tids, [oldest, newest]);
});

Deno.test("is true for valid tids", () => {
  const tid = TID.next();
  const asStr = tid.toString();

  assert(TID.is(asStr));
});

Deno.test("is false for invalid tids", () => {
  assertFalse(TID.is(""));
});

Deno.test("equals true when same tid", () => {
  const tid = TID.next();
  assert(tid.equals(tid));
});

Deno.test("equals true when different instance, same tid", () => {
  const tid0 = TID.next();
  const tid1 = new TID(tid0.toString());

  assert(tid0.equals(tid1));
});

Deno.test("equals false when different tid", () => {
  const tid0 = TID.next();
  const tid1 = TID.next();

  assertFalse(tid0.equals(tid1));
});

Deno.test("newerThan true for newer tid", () => {
  const tid0 = TID.next();
  const tid1 = TID.next();

  assert(tid1.newerThan(tid0));
});

Deno.test("newerThan false for older tid", () => {
  const tid0 = TID.next();
  const tid1 = TID.next();

  assertFalse(tid0.newerThan(tid1));
});

Deno.test("newerThan false for identical tids", () => {
  const tid0 = TID.next();
  const tid1 = new TID(tid0.toString());

  assertFalse(tid0.newerThan(tid1));
});

Deno.test("olderThan true for older tid", () => {
  const tid0 = TID.next();
  const tid1 = TID.next();

  assert(tid0.olderThan(tid1));
});

Deno.test("olderThan false for newer tid", () => {
  const tid0 = TID.next();
  const tid1 = TID.next();

  assertFalse(tid1.olderThan(tid0));
});

Deno.test("olderThan false for identical tids", () => {
  const tid0 = TID.next();
  const tid1 = new TID(tid0.toString());

  assertFalse(tid0.olderThan(tid1));
});
