import type { CID } from "multiformats/cid";
import type { RepoEvent } from "../firehose/lexicons.ts";

export interface MockFirehoseServerOptions {
  port?: number;
  events?: RepoEvent[];
  eventDelay?: number;
}

export class MockFirehoseServer {
  private port: number;
  private events: RepoEvent[];
  private eventDelay: number;
  private server: Deno.HttpServer | null = null;
  private connections = new Set<WebSocket>();

  constructor(options: MockFirehoseServerOptions = {}) {
    this.port = options.port ?? 8080;
    this.events = options.events ?? [];
    this.eventDelay = options.eventDelay ?? 100;
  }

  start(): void {
    this.server = Deno.serve({
      port: this.port,
      handler: (req) => this.handleRequest(req),
    });
    console.log(`Mock firehose server started on port ${this.port}`);
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.shutdown();
      this.server = null;
    }
    // Close all active connections
    for (const ws of this.connections) {
      try {
        ws.close();
      } catch {
        // Ignore errors when closing
      }
    }
    this.connections.clear();
  }

  private handleRequest(req: Request): Response {
    const url = new URL(req.url);

    // Handle WebSocket upgrade for the firehose endpoint
    if (url.pathname === "/xrpc/com.atproto.sync.subscribeRepos") {
      if (req.headers.get("upgrade") !== "websocket") {
        return new Response("Expected websocket", { status: 400 });
      }

      const { socket, response } = Deno.upgradeWebSocket(req);
      this.connections.add(socket);

      socket.onopen = () => {
        console.log("WebSocket connection opened");
        this.startEventStream(socket);
      };

      socket.onclose = () => {
        console.log("WebSocket connection closed");
        this.connections.delete(socket);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.connections.delete(socket);
      };

      return response;
    }

    return new Response("Not found", { status: 404 });
  }

  private async startEventStream(socket: WebSocket): Promise<void> {
    try {
      for (const event of this.events) {
        if (socket.readyState !== WebSocket.OPEN) {
          break;
        }

        // Encode the event as a frame (simplified version)
        const frame = this.encodeFrame(event);
        socket.send(frame);

        // Wait before sending next event
        if (this.eventDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.eventDelay));
        }
      }
    } catch (error) {
      console.error("Error streaming events:", error);
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    }
  }

  private encodeFrame(event: RepoEvent): ArrayBuffer {
    // This is a simplified frame encoding for testing
    // In reality, this would use the proper XRPC streaming format

    const header = {
      op: 1, // Message frame
      t: event.$type,
    };

    const headerBytes = new TextEncoder().encode(JSON.stringify(header));
    const bodyBytes = new TextEncoder().encode(JSON.stringify(event));

    // Create a simple frame: [header_length][header][body]
    const frame = new ArrayBuffer(4 + headerBytes.length + bodyBytes.length);
    const view = new DataView(frame);
    const uint8View = new Uint8Array(frame);

    // Write header length
    view.setUint32(0, headerBytes.length, false);

    // Write header
    uint8View.set(headerBytes, 4);

    // Write body
    uint8View.set(bodyBytes, 4 + headerBytes.length);

    return frame;
  }

  addEvent(event: RepoEvent): void {
    this.events.push(event);
  }

  setEvents(events: RepoEvent[]): void {
    this.events = events;
  }

  clearEvents(): void {
    this.events = [];
  }

  get url(): string {
    return `ws://localhost:${this.port}`;
  }
}

// Helper functions to create mock events
export const createMockCommitEvent = (
  repo: string,
  seq: number,
  collection: string,
  rkey: string,
  record: Record<string, unknown>,
  action: "create" | "update" | "delete" = "create",
): RepoEvent => {
  const mockCID = {
    toString: () => `mock-cid-${seq}`,
    equals: (other: { toString(): string }) =>
      other.toString() === `mock-cid-${seq}`,
  };

  return {
    $type: "com.atproto.sync.subscribeRepos#commit",
    seq,
    time: new Date().toISOString(),
    repo,
    commit: mockCID as unknown as CID,
    rev: `rev-${seq}`,
    ops: [{
      action,
      path: `${collection}/${rkey}`,
      cid: action === "delete" ? null : mockCID as unknown as CID,
    }],
    blocks: new Uint8Array(
      JSON.stringify(record).split("").map((c) => c.charCodeAt(0)),
    ),
  };
};

export const createMockIdentityEvent = (
  did: string,
  seq: number,
): RepoEvent => ({
  $type: "com.atproto.sync.subscribeRepos#identity",
  seq,
  time: new Date().toISOString(),
  did,
});

export const createMockAccountEvent = (
  did: string,
  seq: number,
  active = true,
  status?: string,
): RepoEvent => ({
  $type: "com.atproto.sync.subscribeRepos#account",
  seq,
  time: new Date().toISOString(),
  did,
  active,
  status,
});

export const createMockSyncEvent = (
  did: string,
  seq: number,
  rev: string,
): RepoEvent => ({
  $type: "com.atproto.sync.subscribeRepos#sync",
  seq,
  time: new Date().toISOString(),
  did,
  rev,
  blocks: new Uint8Array([0x01, 0x02, 0x03]), // Mock blocks
});
