import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import type { DidString } from "@atp/lex";
import { type Agent, buildAgent, isAgent } from "../agent.ts";

Deno.test("buildAgent returns same object for Agent input", () => {
  const agent: Agent = {
    did: "did:plc:test" as DidString,
    fetchHandler: (_path, _init) => Promise.resolve(new Response(null)),
  };

  const result = buildAgent(agent);
  assertStrictEquals(result, agent);
});

Deno.test("buildAgent from service url constructs request url", async () => {
  const calls: URL[] = [];
  const fetchMock: typeof fetch = ((input: RequestInfo | URL) => {
    const url = input instanceof URL ? input : new URL(String(input));
    calls.push(url);
    return Promise.resolve(new Response(null));
  }) as typeof fetch;

  const agent = buildAgent({
    service: "https://example.com",
    fetch: fetchMock,
  });

  await agent.fetchHandler("/xrpc/io.example.test?limit=1", {
    method: "GET",
  });

  assertEquals(calls.length, 1);
  assertEquals(
    calls[0]?.toString(),
    "https://example.com/xrpc/io.example.test?limit=1",
  );
});

Deno.test("buildAgent merges default and request headers with request precedence", async () => {
  let seenHeaders: Headers | undefined;
  const fetchMock: typeof fetch = ((_input, init) => {
    seenHeaders = new Headers(
      (init as { headers?: HeadersInit } | undefined)?.headers,
    );
    return Promise.resolve(new Response(null));
  }) as typeof fetch;

  const agent = buildAgent({
    service: "https://example.com",
    headers: {
      authorization: "Bearer default",
      "x-default": "yes",
    },
    fetch: fetchMock,
  });

  await agent.fetchHandler("/xrpc/io.example.test", {
    method: "GET",
    headers: {
      authorization: "Bearer request",
      "x-request": "yes",
    },
  });

  assert(seenHeaders != null);
  assertEquals(seenHeaders.get("authorization"), "Bearer request");
  assertEquals(seenHeaders.get("x-default"), "yes");
  assertEquals(seenHeaders.get("x-request"), "yes");
});

Deno.test("buildAgent keeps did as live getter", () => {
  const config: { did: DidString; service: string } = {
    did: "did:plc:one" as DidString,
    service: "https://example.com",
  };
  const agent = buildAgent(config);
  assertEquals(agent.did, "did:plc:one" as DidString);
  config.did = "did:plc:two" as DidString;
  assertEquals(agent.did, "did:plc:two" as DidString);
});

Deno.test("isAgent detects valid and invalid values", () => {
  assert(!isAgent(null));
  assert(!isAgent({}));
  assert(
    isAgent({
      did: "did:plc:test" as DidString,
      fetchHandler: (_path: `/${string}`, _init: RequestInit) =>
        Promise.resolve(new Response(null)),
    }),
  );
});
