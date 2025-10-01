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

  // Mock the resolve methods
  resolver.did.resolve = (did: string) =>
    Promise.resolve({
      id: did,
      verificationMethod: [],
      service: [{
        id: "#atproto_pds",
        type: "AtprotoPersonalDataServer",
        serviceEndpoint: "https://test.pds",
      }],
      alsoKnownAs: [`at://${did.replace("did:plc:", "")}.test`],
    });

  resolver.handle.resolve = (handle: string) => {
    const didMap: Record<string, string> = {
      "alice123.test": "did:plc:alice123",
      "bob456.test": "did:plc:bob456",
    };
    return Promise.resolve(didMap[handle]);
  };

  return resolver;
};

Deno.test({
  name: "parseAccount - creates account events with no status",
  fn() {
    const account: Account = {
      $type: "com.atproto.sync.subscribeRepos#account",
      seq: 200,
      time: "2024-01-01T13:00:00.000Z",
      did: "did:plc:alice123",
      active: true,
      status: undefined,
    };

    const event = parseAccount(account);

    assertObjectMatch(event!, {
      event: "account",
      seq: 200,
      time: "2024-01-01T13:00:00.000Z",
      did: "did:plc:alice123",
      active: true,
      status: undefined,
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
  name: "parseAccount - returns undefined for invalid status",
  fn() {
    const account: Account = {
      $type: "com.atproto.sync.subscribeRepos#account",
      seq: 202,
      time: "2024-01-01T13:02:00.000Z",
      did: "did:plc:alice123",
      active: true,
      status: "active", // "active" is not a valid status
    };

    const event = parseAccount(account);
    assertEquals(event, undefined);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseIdentity - creates identity events with resolved DID",
  async fn() {
    const idResolver = createMockIdResolver();

    const identity: Identity = {
      $type: "com.atproto.sync.subscribeRepos#identity",
      seq: 300,
      time: "2024-01-01T14:00:00.000Z",
      did: "did:plc:alice123",
    };

    const event = await parseIdentity(idResolver, identity);

    assertObjectMatch(event!, {
      event: "identity",
      seq: 300,
      time: "2024-01-01T14:00:00.000Z",
      did: "did:plc:alice123",
      handle: "alice123.test",
      didDocument: {
        id: "did:plc:alice123",
        service: [{
          id: "#atproto_pds",
          type: "AtprotoPersonalDataServer",
          serviceEndpoint: "https://test.pds",
        }],
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

Deno.test({
  name: "parseIdentity - handles DID resolution failure",
  async fn() {
    const didCache = new MemoryCache();
    const resolver = new IdResolver({
      plcUrl: "http://localhost:3000",
      didCache,
    });

    // Mock resolver to return null (failed resolution)
    resolver.did.resolve = () => Promise.resolve(null);

    const identity: Identity = {
      $type: "com.atproto.sync.subscribeRepos#identity",
      seq: 302,
      time: "2024-01-01T14:02:00.000Z",
      did: "did:plc:unknown",
    };

    const event = await parseIdentity(resolver, identity);

    assertObjectMatch(event!, {
      event: "identity",
      seq: 302,
      did: "did:plc:unknown",
      handle: undefined,
      didDocument: undefined,
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseIdentity - handles handle resolution failure",
  async fn() {
    const idResolver = createMockIdResolver();

    // Override handle resolver to return undefined
    idResolver.handle.resolve = () => Promise.resolve(undefined);

    const identity: Identity = {
      $type: "com.atproto.sync.subscribeRepos#identity",
      seq: 303,
      time: "2024-01-01T14:03:00.000Z",
      did: "did:plc:alice123",
    };

    const event = await parseIdentity(idResolver, identity);

    assertObjectMatch(event!, {
      event: "identity",
      seq: 303,
      did: "did:plc:alice123",
      handle: undefined, // Handle resolution failed
      didDocument: {
        id: "did:plc:alice123",
      },
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
