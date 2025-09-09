import { Hono } from "hono";
import { Lexicons } from "@atproto/lexicon";
import type { Context, Next } from "hono";
import type { LexiconDoc } from "@atproto/lexicon";

export function createServer(lexicons?: LexiconDoc[]) {
  const routes = new Hono();
  const lex = new Lexicons();

  if (lexicons) {
    for (const doc of lexicons) {
      lex.add(doc);
    }
  }

  routes.all("/xrpc/:methodId", async (c: Context, next: Next) => {
    const methodId = c.req.param("methodId");
    const def = lex.getDef(methodId);

    if (!def) {
      return c.json({ error: "Method Not Found" }, 404);
    }

    // Validate method
    if (def.type === "query" && c.req.method !== "GET") {
      return c.json({ error: "Invalid Method", message: "Expected GET" }, 405);
    } else if (def.type === "procedure" && c.req.method !== "POST") {
      return c.json({ error: "Invalid Method", message: "Expected POST" }, 405);
    }

    // Let the router handle it
    await next();
  });

  return {
    routes,
    method(nsid: string, handler: (c: Context) => Promise<Response>) {
      const def = lex.getDef(nsid);
      if (!def) throw new Error(`Unknown lexicon: ${nsid}`);

      const method = def.type === "procedure" ? "post" : "get";
      routes[method](`/xrpc/${nsid}`, handler);
    },
  };
}
