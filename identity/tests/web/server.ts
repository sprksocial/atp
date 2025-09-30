import type { DidDocument } from "../../mod.ts";
import type { DidWebDb } from "./db.ts";

const DOC_PATH = "/.well-known/did.json";

const handleRequest = async (
  request: Request,
  db: DidWebDb,
): Promise<Response> => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Set CORS headers for all responses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "GET") {
    const got = db.get(pathname);
    if (got === null) {
      return new Response("Not found", {
        status: 404,
        headers: corsHeaders,
      });
    }
    return new Response(JSON.stringify(got), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/did+ld+json",
      },
    });
  }

  if (request.method === "POST" && pathname === "/") {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad Request", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { didDoc } = body;
    if (!didDoc) {
      return new Response("Bad Request", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // @TODO add in some proof
    // @TODO validate didDoc body
    const path = idToPath(didDoc.id);
    db.put(path, didDoc);
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  return new Response("Method Not Allowed", {
    status: 405,
    headers: corsHeaders,
  });
};

const idToPath = (id: string): string => {
  const idp = id.split(":").slice(3);
  let path = idp.length > 0
    ? idp.map(decodeURIComponent).join("/") + "/did.json"
    : DOC_PATH;

  if (!path.startsWith("/")) path = `/${path}`;
  return path;
};

export class DidWebServer {
  port: number;
  private _db: DidWebDb;
  private _abortController: AbortController | null = null;

  constructor(_db: DidWebDb, port: number) {
    this._db = _db;
    this.port = port;
  }

  static create(db: DidWebDb, port: number): DidWebServer {
    const server = new DidWebServer(db, port);

    server._abortController = new AbortController();
    Deno.serve({
      port,
      signal: server._abortController.signal,
    }, (request) => handleRequest(request, db));

    return server;
  }

  getByPath(didPath?: string): DidDocument | null {
    if (!didPath) return null;
    return this._db.get(didPath);
  }

  getById(did?: string): DidDocument | null {
    if (!did) return null;
    const path = idToPath(did);
    return this.getByPath(path);
  }

  put(didDoc: DidDocument) {
    this._db.put(idToPath(didDoc.id), didDoc);
  }

  delete(didOrDoc: string | DidDocument) {
    const did = typeof didOrDoc === "string" ? didOrDoc : didOrDoc.id;
    const path = idToPath(did);
    this._db.del(path);
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this._abortController) {
        this._abortController.abort();
      }
      resolve();
    });
  }
}
