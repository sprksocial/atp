import { assertEquals, assertRejects } from "jsr:@std/assert";
import { retry } from "../mod.ts";

Deno.test("retries until max retries", async () => {
  let fnCalls = 0;
  let waitMsCalls = 0;
  const fn = () => {
    fnCalls++;
    throw new Error(`Oops ${fnCalls}!`);
  };
  const getWaitMs = (retries: number) => {
    waitMsCalls++;
    assertEquals(retries, waitMsCalls - 1);
    return 0;
  };
  await assertRejects(
    () => retry(fn, { maxRetries: 13, getWaitMs }),
    Error,
    "Oops 14!",
  );
  assertEquals(fnCalls, 14);
  assertEquals(waitMsCalls, 14);
});

Deno.test("retries until max wait", async () => {
  let fnCalls = 0;
  let waitMsCalls = 0;
  const fn = () => {
    fnCalls++;
    throw new Error(`Oops ${fnCalls}!`);
  };
  const getWaitMs = (retries: number) => {
    waitMsCalls++;
    assertEquals(retries, waitMsCalls - 1);
    if (retries === 13) {
      return null;
    }
    return 0;
  };
  await assertRejects(
    () => retry(fn, { maxRetries: Infinity, getWaitMs }),
    Error,
    "Oops 14!",
  );
  assertEquals(fnCalls, 14);
  assertEquals(waitMsCalls, 14);
});

Deno.test("retries until non-retryable error", async () => {
  let fnCalls = 0;
  let waitMsCalls = 0;
  const fn = () => {
    fnCalls++;
    throw new Error(`Oops ${fnCalls}!`);
  };
  const getWaitMs = (retries: number) => {
    waitMsCalls++;
    assertEquals(retries, waitMsCalls - 1);
    return 0;
  };
  const retryable = (err: unknown) => (err as Error)?.message !== "Oops 14!";
  await assertRejects(
    () => retry(fn, { maxRetries: Infinity, getWaitMs, retryable }),
    Error,
    "Oops 14!",
  );
  assertEquals(fnCalls, 14);
  assertEquals(waitMsCalls, 14);
});

Deno.test("returns latest result after retries", async () => {
  let fnCalls = 0;
  const fn = () => {
    fnCalls++;
    if (fnCalls < 14) {
      throw new Error(`Oops ${fnCalls}!`);
    }
    return "ok";
  };
  const getWaitMs = () => 0;
  const result = await retry(fn, { maxRetries: Infinity, getWaitMs });
  assertEquals(result, "ok");
  assertEquals(fnCalls, 14);
});

Deno.test("returns result immediately on success", async () => {
  let fnCalls = 0;
  const fn = () => {
    fnCalls++;
    return "ok";
  };
  const getWaitMs = () => 0;
  const result = await retry(fn, { maxRetries: Infinity, getWaitMs });
  assertEquals(result, "ok");
  assertEquals(fnCalls, 1);
});
