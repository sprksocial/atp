/**
 * XRPC Server implementation for atproto services.
 *
 * This module provides a Hono-based server implementation for atproto's XRPC protocol,
 * with support for Lexicon schema validation, authentication, rate limiting, and streaming.
 * Written in TypeScript with full type safety and designed to work across JavaScript runtimes.
 *
 * ## Features
 * - Full Lexicon schema validation
 * - Built on Hono for high performance and runtime compatibility
 * - Authentication (Basic Auth, Bearer tokens, JWT verification)
 * - Rate limiting (global, shared, and per-route)
 * - WebSocket streaming support
 * - Server timing utilities for performance monitoring
 * - Comprehensive error handling with XRPC error types
 * - TypeScript-first with complete type definitions
 *
 * ## Runtime Compatibility
 * Works with Deno, Node.js, Bun, Cloudflare Workers, and other JavaScript runtimes
 * supported by Hono.
 *
 * Note: Subscription (WebSocket) endpoints are currently supported only in Deno
 * and Cloudflare Workers. On Node.js and Bun, query/procedure routes function
 * normally, but subscription endpoints are not yet available (WebSocket upgrades
 * will be rejected or unmounted).
 *
 * @example Basic server setup with a simple endpoint
 * ```ts
 * import { createServer } from "jsr:@atp/xrpc-server";
 * import type { LexiconDoc } from "@atp/lexicon";
 *
 * const lexicons: LexiconDoc[] = [{
 *   lexicon: 1,
 *   id: "com.example.ping",
 *   defs: {
 *     main: {
 *       type: "query",
 *       parameters: {
 *         type: "params",
 *         properties: { message: { type: "string" } },
 *       },
 *       output: {
 *         encoding: "application/json",
 *       },
 *     },
 *   },
 * }];
 *
 * const server = createServer(lexicons);
 * server.method("com.example.ping", {
 *   handler: ({ params }) => ({
 *     encoding: "application/json",
 *     body: { message: params.message || "Hello World!" }
 *   })
 * });
 *
 * // Deno
 * Deno.serve(server.handler.fetch);
 * ```
 *
 * @example Authentication with custom auth verifiers
 * ```ts
 * import { createServer, AuthRequiredError } from "jsr:@atp/xrpc-server";
 *
 * const server = createServer(lexicons);
 *
 * // Basic Auth verification
 * server.method("com.example.protected", {
 *   auth: async ({ req }) => {
 *     const auth = req.headers.get("Authorization");
 *     if (!auth?.startsWith("Basic ")) {
 *       throw new AuthRequiredError("Basic auth required");
 *     }
 *     const [username, password] = atob(auth.slice(6)).split(":");
 *     if (username !== "admin" || password !== "secret") {
 *       throw new AuthRequiredError("Invalid credentials");
 *     }
 *     return { credentials: { username } };
 *   },
 *   handler: ({ auth }) => ({
 *     encoding: "application/json",
 *     body: { user: auth?.credentials?.username }
 *   })
 * });
 *
 * // Bearer token verification
 * server.method("com.example.tokenProtected", {
 *   auth: async ({ req }) => {
 *     const token = req.headers.get("Authorization")?.replace("Bearer ", "");
 *     if (!token) throw new AuthRequiredError("Bearer token required");
 *
 *     // Verify token (implement your own logic)
 *     const user = await verifyToken(token);
 *     return { credentials: user };
 *   },
 *   handler: ({ auth }) => ({
 *     encoding: "application/json",
 *     body: { userId: auth?.credentials?.id }
 *   })
 * });
 * ```
 *
 * @example Rate limiting configuration
 * ```ts
 * import { createServer } from "jsr:@atp/xrpc-server";
 * import { MemoryRateLimiter } from "@atp/xrpc-server";
 *
 * const server = createServer(lexicons, {
 *   rateLimits: {
 *     creator: (opts) => new MemoryRateLimiter(opts),
 *     global: [{
 *       name: "global",
 *       durationMs: 60000,  // 1 minute
 *       points: 100        // 100 requests per minute
 *     }],
 *     shared: [{
 *       name: "auth-heavy",
 *       durationMs: 300000,  // 5 minutes
 *       points: 20          // 20 requests per 5 minutes
 *     }],
 *     bypass: (ctx) => ctx.auth?.credentials?.isAdmin === true
 *   }
 * });
 *
 * // Per-route rate limiting
 * server.method("com.example.limited", {
 *   rateLimit: [
 *     { name: "auth-heavy" }, // Use shared rate limiter
 *     { durationMs: 60000, points: 10 } // Additional route-specific limit
 *   ],
 *   handler: () => ({
 *     encoding: "application/json",
 *     body: { status: "ok" }
 *   })
 * });
 * ```
 *
 * @example Streaming endpoint with proper error handling
 * ```ts
 * import { createServer, ErrorFrame } from "jsr:@atp/xrpc-server";
 *
 * const server = createServer(lexicons);
 *
 * server.streamMethod("com.example.events", {
 *   auth: async ({ req }) => {
 *     // Authenticate streaming connections
 *     const token = req.headers.get("Authorization")?.replace("Bearer ", "");
 *     if (!token) throw new AuthRequiredError("Authentication required");
 *     return { credentials: await verifyToken(token) };
 *   },
 *   handler: async function* ({ auth, signal }) {
 *     try {
 *       const eventStream = subscribeToEvents(auth.credentials.userId);
 *
 *       while (!signal.aborted) {
 *         const event = await eventStream.next();
 *         if (event.done) break;
 *
 *         yield {
 *           timestamp: new Date().toISOString(),
 *           event: event.value
 *         };
 *       }
 *     } catch (error) {
 *       yield new ErrorFrame({
 *         error: "StreamError",
 *         message: error.message
 *       });
 *     }
 *   }
 * });
 * ```
 *
 * @example Error handling and custom error conversion
 * ```ts
 * import { createServer, XRPCError, InternalServerError } from "jsr:@atp/xrpc-server";
 *
 * const server = createServer(lexicons, {
 *   errorParser: (err) => {
 *     if (err instanceof MyCustomError) {
 *       return new InvalidRequestError(err.message, "CustomError");
 *     }
 *     return XRPCError.fromError(err);
 *   }
 * });
 * ```
 *
 * @module
 */

export * from "./types.ts";
export * from "./auth.ts";
export * from "./server.ts";
export * from "./errors.ts";

export * from "./stream/index.ts";
export * from "./rate-limiter.ts";
export {
  parseReqNsid,
  ServerTimer,
  type ServerTiming,
  serverTimingHeader,
} from "./util.ts";
