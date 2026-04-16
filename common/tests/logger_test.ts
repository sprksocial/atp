import { assertEquals } from "@std/assert";
import { _resetLoggerStateForTest, subsystemLogger } from "../logger.ts";

async function withPatchedEnvGet<T>(
  get: typeof Deno.env.get,
  fn: () => Promise<T> | T,
): Promise<T> {
  const original = Deno.env.get;
  Object.defineProperty(Deno.env, "get", {
    configurable: true,
    writable: true,
    value: get,
  });

  try {
    return await fn();
  } finally {
    Object.defineProperty(Deno.env, "get", {
      configurable: true,
      writable: true,
      value: original,
    });
  }
}

Deno.test("subsystemLogger defers env access until a log method is called", async () => {
  const calls: string[] = [];

  await withPatchedEnvGet((name) => {
    calls.push(name);
    return undefined;
  }, async () => {
    _resetLoggerStateForTest();
    const logger = subsystemLogger("repo");

    assertEquals(calls, []);

    logger.info("hello");

    assertEquals(calls, [
      "LOG_SYSTEMS",
      "LOG_ENABLED",
      "LOG_LEVEL",
      "LOG_DESTINATION",
    ]);
  });
});

Deno.test("subsystemLogger treats env permission errors as unset", async () => {
  await withPatchedEnvGet(() => {
    throw new Deno.errors.PermissionDenied("env denied");
  }, async () => {
    _resetLoggerStateForTest();
    const logger = subsystemLogger("repo");

    logger.info("hello");
  });
});
