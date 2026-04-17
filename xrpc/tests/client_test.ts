import { l } from "@atp/lex";
import { assertEquals, assertRejects } from "@std/assert";
import { Client } from "../mod.ts";
import type { XrpcCallCompatibleOptions } from "../types.ts";
import { XRPCError, XRPCInvalidResponseError } from "../types.ts";

type Expect<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;

Deno.test("calls query with lex method and params", async () => {
  const method = l.query(
    "io.example.query",
    l.params({ limit: l.optional(l.integer()) }),
    l.jsonPayload({ value: l.string() }),
  );

  const client = new Client((url, init) => {
    assertEquals(url, "/xrpc/io.example.query?limit=7");
    assertEquals(init.method, "get");
    return Promise.resolve(Response.json({ value: "ok" }));
  });

  const result = await client.call(method, {
    params: { limit: 7 },
  });

  assertEquals(result.data, { value: "ok" });
});

Deno.test("calls query with xrpc", async () => {
  const method = l.query(
    "io.example.query",
    l.params({ limit: l.optional(l.integer()) }),
    l.jsonPayload({ value: l.string() }),
  );

  const client = new Client((url, init) => {
    assertEquals(url, "/xrpc/io.example.query?limit=9");
    assertEquals(init.method, "get");
    return Promise.resolve(Response.json({ value: "ok" }));
  });

  const result = await client.xrpc(method, {
    params: { limit: 9 },
  });

  assertEquals(result.data, { value: "ok" });
});

Deno.test("narrows xrpcSafe success results on success flag", async () => {
  const method = l.query(
    "io.example.query",
    l.params({ limit: l.optional(l.integer()) }),
    l.jsonPayload({ value: l.string() }),
  );

  const client = new Client((url, init) => {
    assertEquals(url, "/xrpc/io.example.query?limit=8");
    assertEquals(init.method, "get");
    return Promise.resolve(Response.json({ value: "ok" }));
  });

  const result = await client.xrpcSafe(method, {
    params: { limit: 8 },
  });

  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data, { value: "ok" });
  } else {
    throw new Error(result.error);
  }
});

Deno.test("keeps call as a compatibility alias for xrpc", async () => {
  const method = l.query(
    "io.example.query",
    l.params({ limit: l.optional(l.integer()) }),
    l.jsonPayload({ value: l.string() }),
  );

  const client = new Client((url, init) => {
    assertEquals(url, "/xrpc/io.example.query?limit=4");
    assertEquals(init.method, "get");
    return Promise.resolve(Response.json({ value: "ok" }));
  });

  const result = await client.call(method, {
    params: { limit: 4 },
  });

  assertEquals(result.data, { value: "ok" });
});

Deno.test("serializes params using schema transforms", async () => {
  const method = l.query(
    "io.example.query",
    l.params({
      since: l.optional(l.string({ format: "datetime" })),
    }),
    l.jsonPayload({ value: l.string() }),
  );

  const client = new Client((url) => {
    assertEquals(
      url,
      "/xrpc/io.example.query?since=2024-01-02T03%3A04%3A05.000Z",
    );
    return Promise.resolve(Response.json({ value: "ok" }));
  });

  const result = await client.call(method, {
    params: {
      since: new Date("2024-01-02T03:04:05.000Z"),
    } as unknown as never,
  });

  assertEquals(result.data, { value: "ok" });
});

Deno.test("accepts plain strings for formatted query params", async () => {
  const method = l.query(
    "io.example.getRecord",
    l.params({
      repo: l.string({ format: "at-identifier" }),
      collection: l.string({ format: "nsid" }),
      rkey: l.string({ format: "record-key" }),
      uri: l.optional(l.string({ format: "uri" })),
    }),
    l.payload(),
  );

  const client = new Client((url, init) => {
    assertEquals(
      url,
      "/xrpc/io.example.getRecord?repo=did%3Aplc%3A6hbqm2oftpotwuw7gvvrui3i&collection=app.bsky.feed.post&rkey=3mjlhmszzo22h&uri=https%3A%2F%2Fexample.com%2Fpost%2F1",
    );
    assertEquals(init.method, "get");
    return Promise.resolve(new Response(null));
  });

  await client.call(method, {
    params: {
      repo: "did:plc:6hbqm2oftpotwuw7gvvrui3i",
      collection: "app.bsky.feed.post",
      rkey: "3mjlhmszzo22h",
      uri: "https://example.com/post/1",
    },
  });
});

Deno.test("only matching string literals satisfy formatted params", () => {
  const method = l.query(
    "io.example.getRecord",
    l.params({
      repo: l.string({ format: "at-identifier" }),
      collection: l.string({ format: "nsid" }),
      rkey: l.string({ format: "record-key" }),
    }),
    l.payload(),
  );

  type Valid = XrpcCallCompatibleOptions<typeof method, {
    params: {
      repo: "did:plc:6hbqm2oftpotwuw7gvvrui3i";
      collection: "app.bsky.feed.post";
      rkey: "3mjlhmszzo22h";
    };
  }>;
  type InvalidRepo = XrpcCallCompatibleOptions<typeof method, {
    params: {
      repo: "not-a-valid-at-identifier";
      collection: "app.bsky.feed.post";
      rkey: "3mjlhmszzo22h";
    };
  }>;
  type GenericRepo = XrpcCallCompatibleOptions<typeof method, {
    params: {
      repo: string;
      collection: "app.bsky.feed.post";
      rkey: "3mjlhmszzo22h";
    };
  }>;

  type ValidParams = NonNullable<Valid["params"]>;
  type InvalidRepoParams = NonNullable<InvalidRepo["params"]>;
  type GenericRepoParams = NonNullable<GenericRepo["params"]>;

  type _validRepo = Expect<
    IsNever<ValidParams["repo"]> extends false ? true : false
  >;
  type _invalidRepo = Expect<IsNever<InvalidRepoParams["repo"]>>;
  type _genericRepo = Expect<IsNever<GenericRepoParams["repo"]>>;
});

Deno.test("calls query with namespace main export", async () => {
  const main = l.query(
    "io.example.query",
    l.params({ limit: l.optional(l.integer()) }),
    l.jsonPayload({ value: l.string() }),
  );
  const namespace = { main } as const;

  const client = new Client((url, init) => {
    assertEquals(url, "/xrpc/io.example.query?limit=3");
    assertEquals(init.method, "get");
    return Promise.resolve(Response.json({ value: "ok" }));
  });

  const result = await client.call(namespace, {
    params: { limit: 3 },
  });

  assertEquals(result.data, { value: "ok" });
});

Deno.test("calls query with namespace Main export", async () => {
  const Main = l.query(
    "io.example.query",
    l.params({ limit: l.optional(l.integer()) }),
    l.jsonPayload({ value: l.string() }),
  );
  const namespace = { Main } as const;

  const client = new Client((url, init) => {
    assertEquals(url, "/xrpc/io.example.query?limit=5");
    assertEquals(init.method, "get");
    return Promise.resolve(Response.json({ value: "ok" }));
  });

  const result = await client.call(namespace, {
    params: { limit: 5 },
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

  const client = new Client(() => Promise.resolve(Response.json({ id: 123 })));

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

Deno.test("returns xrpc errors from xrpcSafe", async () => {
  const method = l.query(
    "io.example.query",
    l.params({ limit: l.optional(l.integer()) }),
    l.jsonPayload({ value: l.string() }),
  );

  const client = new Client(() =>
    Promise.resolve(
      Response.json(
        { error: "BadRequest", message: "nope" },
        { status: 400 },
      ),
    )
  );

  const result = await client.xrpcSafe(method, {
    params: { limit: 1 },
  });

  assertEquals(result.success, false);

  if (!result.success) {
    assertEquals(result.success, false);
    assertEquals(result.error, "BadRequest");
    assertEquals(result.message, "nope");
  } else {
    throw new Error(JSON.stringify(result.data));
  }
});

Deno.test("accepts formatted strings in json request bodies", async () => {
  const method = l.procedure(
    "io.example.proc",
    l.params(),
    l.jsonPayload({
      repo: l.string({ format: "at-identifier" }),
      rkey: l.string({ format: "record-key" }),
      createdAt: l.string({ format: "datetime" }),
    }),
    l.payload(),
  );

  const client = new Client((_url, init) => {
    assertEquals(init.method, "post");
    assertEquals(
      new Headers(init.headers).get("content-type"),
      "application/json",
    );
    return Promise.resolve(new Response(null));
  });

  await client.call(method, {
    body: {
      repo: "did:plc:6hbqm2oftpotwuw7gvvrui3i",
      rkey: "3mjlhmszzo22h",
      createdAt: "2024-01-02T03:04:05.000Z",
    },
  });
});

Deno.test("only matching string literals satisfy formatted json bodies", () => {
  const method = l.procedure(
    "io.example.proc",
    l.params(),
    l.jsonPayload({
      createdAt: l.string({ format: "datetime" }),
      uri: l.string({ format: "at-uri" }),
      cid: l.string({ format: "cid" }),
    }),
    l.payload(),
  );

  type Valid = XrpcCallCompatibleOptions<typeof method, {
    body: {
      createdAt: "2024-01-02T03:04:05.000Z";
      uri:
        "at://did:plc:6hbqm2oftpotwuw7gvvrui3i/app.bsky.feed.post/3mjlhmszzo22h";
      cid: "bafyreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
    };
  }>;
  type InvalidDatetime = XrpcCallCompatibleOptions<typeof method, {
    body: {
      createdAt: "2024-01-02";
      uri:
        "at://did:plc:6hbqm2oftpotwuw7gvvrui3i/app.bsky.feed.post/3mjlhmszzo22h";
      cid: "bafyreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
    };
  }>;
  type InvalidUri = XrpcCallCompatibleOptions<typeof method, {
    body: {
      createdAt: "2024-01-02T03:04:05.000Z";
      uri: "https://example.com/post/1";
      cid: "bafyreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
    };
  }>;

  type ValidBody = NonNullable<Valid["body"]>;
  type InvalidDatetimeBody = NonNullable<InvalidDatetime["body"]>;
  type InvalidUriBody = NonNullable<InvalidUri["body"]>;

  type _validBody = Expect<
    IsNever<ValidBody["createdAt"]> extends false ? true : false
  >;
  type _invalidDatetime = Expect<IsNever<InvalidDatetimeBody["createdAt"]>>;
  type _invalidUri = Expect<IsNever<InvalidUriBody["uri"]>>;
});

Deno.test("uses method encoding defaults for wildcard payloads", async () => {
  const method = l.procedure(
    "io.example.upload",
    l.params(),
    l.payload("image/*"),
    l.jsonPayload({ ok: l.boolean() }),
  );

  const client = new Client((_url, init) => {
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

Deno.test("preserves specific blob types for text wildcard payloads", async () => {
  const method = l.procedure(
    "io.example.upload",
    l.params(),
    l.payload("text/*"),
    l.payload(),
  );

  const client = new Client((_url, init) => {
    const headers = new Headers(init.headers);
    assertEquals(headers.get("content-type"), "text/csv");
    return Promise.resolve(new Response(null));
  });

  await client.call(method, {
    body: new Blob(["a,b\n1,2"], { type: "text/csv" }) as unknown as never,
  });
});

Deno.test("infers body content types for any wildcard payloads", async () => {
  const method = l.procedure(
    "io.example.upload",
    l.params(),
    l.payload("*/*"),
    l.payload(),
  );

  const seen: string[] = [];
  const client = new Client((_url, init) => {
    seen.push(new Headers(init.headers).get("content-type") ?? "");
    return Promise.resolve(new Response(null));
  });

  await client.call(method, {
    body: "hello",
  });

  await client.call(method, {
    body: new Blob(["<p>ok</p>"], { type: "text/html" }),
  });

  assertEquals(seen, [
    "text/plain;charset=UTF-8",
    "text/html",
  ]);
});
