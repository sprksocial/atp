import { assertEquals, assertObjectMatch } from "@std/assert";
import { IdResolver } from "@atp/identity";
import { MemoryCache } from "@atp/identity";
import { parseAccount, parseIdentity } from "../firehose/index.ts";
import type { Account, Identity } from "../firehose/lexicons.ts";

// Mock IdResolver
const createMockIdResolver = (): IdResolver => {
  const didCache = new MemoryCache();
  const resolver = new IdResolver({
    plcUrl: "http://localhost:3000",
    didCache,
  });

  // Mock DID document with no verification methods to avoid crypto parsing
  resolver.did.resolve = (did: string) =>
    Promise.resolve({
      id: did,
      verificationMethod: [],
      service: [{
        id: "#atproto_pds",
        type: "AtprotoPersonalDataServer",
        serviceEndpoint: "https://test.pds",
      }],
      alsoKnownAs: ["at://alice.test"],
    });

  // Mock key resolution
  resolver.did.resolveAtprotoKey = (_did: string) =>
    Promise.resolve("test-key");

  // Mock handle resolution
  resolver.handle.resolve = (handle: string) => {
    const didMap: Record<string, string> = {
      "alice.test": "did:plc:alice123",
      "bob.test": "did:plc:bob456",
    };
    return Promise.resolve(didMap[handle]);
  };

  return resolver;
};

Deno.test({
  name: "parseAccount - returns undefined for invalid status",
  fn() {
    const account: Account = {
      $type: "com.atproto.sync.subscribeRepos#account",
      seq: 200,
      time: "2024-01-01T13:00:00.000Z",
      did: "did:plc:alice123",
      active: true,
      status: "active", // "active" is not a valid status
    };

    const event = parseAccount(account);

    assertEquals(event, undefined); // Should return undefined for invalid status
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAccount - creates account events with valid status",
  fn() {
    const account: Account = {
      $type: "com.atproto.sync.subscribeRepos#account",
      seq: 200,
      time: "2024-01-01T13:00:00.000Z",
      did: "did:plc:alice123",
      active: true,
      status: "suspended",
    };

    const event = parseAccount(account);

    assertObjectMatch(event!, {
      event: "account",
      seq: 200,
      time: "2024-01-01T13:00:00.000Z",
      did: "did:plc:alice123",
      active: true,
      status: "suspended",
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAccount - handles valid status values",
  fn() {
    const validStatuses = ["takendown", "suspended", "deleted", "deactivated"];

    for (const status of validStatuses) {
      const account: Account = {
        $type: "com.atproto.sync.subscribeRepos#account",
        seq: 201,
        time: "2024-01-01T13:01:00.000Z",
        did: "did:plc:alice123",
        active: false,
        status,
      };

      const event = parseAccount(account);
      assertEquals(event!.status, status);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name:
    "parseIdentity - creates identity events with resolved DID (unauthenticated)",
  async fn() {
    const idResolver = createMockIdResolver();

    const identity: Identity = {
      $type: "com.atproto.sync.subscribeRepos#identity",
      seq: 300,
      time: "2024-01-01T14:00:00.000Z",
      did: "did:plc:alice123",
    };

    const event = await parseIdentity(idResolver, identity, true);

    assertObjectMatch(event!, {
      event: "identity",
      seq: 300,
      time: "2024-01-01T14:00:00.000Z",
      did: "did:plc:alice123",
      handle: undefined, // Should be undefined in unauthenticated mode
      didDocument: {
        id: "did:plc:alice123",
      },
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseIdentity - handles unauthenticated mode",
  async fn() {
    const idResolver = createMockIdResolver();

    const identity: Identity = {
      $type: "com.atproto.sync.subscribeRepos#identity",
      seq: 301,
      time: "2024-01-01T14:01:00.000Z",
      did: "did:plc:alice123",
    };

    const event = await parseIdentity(idResolver, identity, true);

    assertObjectMatch(event!, {
      event: "identity",
      seq: 301,
      did: "did:plc:alice123",
      handle: undefined, // Should be undefined in unauthenticated mode
      didDocument: {
        id: "did:plc:alice123",
      },
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
