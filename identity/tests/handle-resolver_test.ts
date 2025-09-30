import { assertEquals } from "@std/assert";
import { HandleResolver } from "../mod.ts";

// Test-specific HandleResolver that mocks DNS responses
class MockHandleResolver extends HandleResolver {
  private mockDnsResults = new Map<string, string[][]>();

  constructor() {
    super();
    // Set up mock DNS responses
    this.mockDnsResults.set("_atproto.simple.test", [[
      "did=did:example:simpleDid",
    ]]);
    this.mockDnsResults.set("_atproto.noisy.test", [[
      "did=did:example:noisyDid",
    ]]);
    this.mockDnsResults.set("_atproto.multi.test", [
      ["did=did:example:first"],
      ["did=did:example:second"],
    ]);
    // bad.test intentionally not added to simulate DNS failure
  }
  //deno-lint-ignore require-await
  override async resolveDns(handle: string): Promise<string | undefined> {
    const domain = `_atproto.${handle}`;

    if (!this.mockDnsResults.has(domain)) {
      return undefined;
    }

    const chunkedResults = this.mockDnsResults.get(domain)!;
    return this.parseDnsResult(chunkedResults);
  }

  override resolveDnsBackup(handle: string): Promise<string | undefined> {
    // For testing, backup resolution behaves the same as regular DNS
    return this.resolveDns(handle);
  }
}

let resolver: MockHandleResolver;

Deno.test.beforeAll(() => {
  resolver = new MockHandleResolver();
});

Deno.test({
  name: "handles a simple DNS resolution",
  async fn() {
    const did = await resolver.resolveDns("simple.test");
    assertEquals(did, "did:example:simpleDid");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "handles a noisy DNS resolution",
  async fn() {
    const did = await resolver.resolveDns("noisy.test");
    assertEquals(did, "did:example:noisyDid");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "handles a bad DNS resolution",
  async fn() {
    const did = await resolver.resolveDns("bad.test");
    assertEquals(did, undefined);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "throws on multiple dids under same domain",
  async fn() {
    const did = await resolver.resolveDns("multi.test");
    assertEquals(did, undefined);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
