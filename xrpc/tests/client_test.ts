import { l } from "@atp/lex";
import { assertEquals, assertRejects } from "@std/assert";
import { XrpcClient } from "../mod.ts";
import { XRPCError, XRPCInvalidResponseError } from "../types.ts";

Deno.test("calls query with lex method and params", async () => {
  const method = l.query(
    "io.example.query",
    l.params({ limit: l.optional(l.integer()) }),
    l.jsonPayload({ value: l.string() }),
  );

  const client = new XrpcClient((url, init) => {
    assertEquals(url, "/xrpc/io.example.query?limit=7");
    assertEquals(init.method, "get");
    return Promise.resolve(Response.json({ value: "ok" }));
  });

  const result = await client.call(method, {
    params: { limit: 7 },
  });

  assertEquals(result.data, { value: "ok" });
});

Deno.test("validates request and response when enabled", async () => {
  const method = l.procedure(
    "io.example.proc",
    l.params(),
    l.jsonPayload({ text: l.string() }),
    l.jsonPayload({ id: l.string() }),
  );

  const client = new XrpcClient(() =>
    Promise.resolve(Response.json({ id: 123 }))
  );

  await assertRejects(
    async () => {
      await client.call(method, {
        body: { text: 1 } as unknown as { text: string },
        validateRequest: true,
      });
    },
    XRPCError,
  );

  await assertRejects(
    async () => {
      await client.call(method, {
        body: { text: "hello" },
        validateResponse: true,
      });
    },
    XRPCInvalidResponseError,
  );
});

Deno.test("uses method encoding defaults for wildcard payloads", async () => {
  const method = l.procedure(
    "io.example.upload",
    l.params(),
    l.payload("image/*"),
    l.jsonPayload({ ok: l.boolean() }),
  );

  const client = new XrpcClient((_url, init) => {
    const headers = new Headers(init.headers);
    assertEquals(headers.get("content-type"), "image/png");
    assertEquals(init.method, "post");
    return Promise.resolve(Response.json({ ok: true }));
  });

  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
  const result = await client.call(method, {
    body: blob,
  });

  assertEquals(result.data, { ok: true });
});
