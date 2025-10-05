import type { Context, Handler } from "hono";
import { Hono } from "hono";
import {
  type LexiconDoc,
  Lexicons,
  type LexXrpcProcedure,
  type LexXrpcQuery,
  type LexXrpcSubscription,
} from "@atp/lexicon";
import {
  excludeErrorResult,
  InternalServerError,
  InvalidRequestError,
  isErrorResult,
  MethodNotImplementedError,
  XRPCError,
} from "./errors.ts";
import { type RateLimiterI, RouteRateLimiter } from "./rate-limiter.ts";
import {
  ErrorFrame,
  Frame,
  MessageFrame,
  XrpcStreamServer,
} from "./stream/index.ts";
import {
  type Auth,
  type AuthResult,
  type AuthVerifier,
  type Awaitable,
  type HandlerContext,
  type HandlerSuccess,
  type Input,
  isHandlerPipeThroughBuffer,
  isHandlerPipeThroughStream,
  isSharedRateLimitOpts,
  type MethodConfig,
  type MethodConfigOrHandler,
  type Options,
  type Params,
  type ServerRateLimitDescription,
  type StreamConfig,
  type StreamConfigOrHandler,
} from "./types.ts";
import {
  asArray,
  createInputVerifier,
  decodeQueryParams,
  getQueryParams,
  parseUrlNsid,
  setHeaders,
  validateOutput,
} from "./util.ts";
import { check, ipldToJson, schema } from "@atp/common";
import {
  type CalcKeyFn,
  type CalcPointsFn,
  type RateLimiterOptions,
  WrappedRateLimiter,
  type WrappedRateLimiterOptions,
} from "./rate-limiter.ts";
import { assert } from "@std/assert";
import type { CatchallHandler, RouteOptions } from "./types.ts";
import {
  mountStreamingRoutesDeno,
  mountStreamingRoutesWorkers,
  type XrpcMux,
} from "./stream/adapters.ts";

/**
 * Creates a new XRPC server instance
 * @param lexicons - Optional array of lexicon documents to initialize the server with
 * @param options - Optional server configuration options
 */
export function createServer(
  lexicons?: LexiconDoc[],
  options?: Options,
): Server {
  return new Server(lexicons, options);
}

/**
 * XRPC server implementation that handles HTTP and WebSocket requests.
 * Manages method registration, authentication, rate limiting, and streaming.
 */
export class Server {
  /** The underlying Hono HTTP server instance */
  app: Hono;
  /** Map of NSID to WebSocket streaming servers for subscriptions */
  subscriptions: Map<string, XrpcStreamServer> = new Map<
    string,
    XrpcStreamServer
  >();
  /** Lexicon registry for schema validation and method definitions */
  lex: Lexicons = new Lexicons();
  /** Server configuration options */
  options: Options;
  /** Global rate limiter applied to all routes */
  globalRateLimiter?: RouteRateLimiter<HandlerContext>;
  /** Map of named shared rate limiters */
  sharedRateLimiters?: Map<string, RateLimiterI<HandlerContext>>;

  /**
   * Creates a new XRPC server instance.
   * @param lexicons - Optional array of lexicon documents to register
   * @param opts - Server configuration options
   */
  constructor(lexicons?: LexiconDoc[], opts: Options = {}) {
    this.app = new Hono();
    this.options = opts;

    if (lexicons) {
      this.addLexicons(lexicons);
    }

    this.app.use("*", this.catchall);
    this.app.onError(createErrorHandler(opts));

    this.app.notFound((c) => {
      const nsid = parseUrlNsid(c.req.url);
      if (nsid) {
        const def = this.lex.getDef(nsid);
        if (def) {
          const expectedMethod = def.type === "procedure"
            ? "POST"
            : def.type === "query"
            ? "GET"
            : null;
          if (expectedMethod != null && expectedMethod !== c.req.method) {
            const error = new InvalidRequestError(
              `Incorrect HTTP method (${c.req.method}) expected ${expectedMethod}`,
            );
            throw error;
          }
        } else {
          const error = new MethodNotImplementedError();
          throw error;
        }
      }
      return c.text("Not Found", 404);
    });

    if (opts.rateLimits) {
      const { global, shared, creator, bypass } = opts.rateLimits;

      if (global) {
        this.globalRateLimiter = RouteRateLimiter.from(
          global.map((options) => creator(buildRateLimiterOptions(options))),
          { bypass },
        );
      }

      if (shared) {
        this.sharedRateLimiters = new Map(
          shared.map((options) => [
            options.name,
            creator(buildRateLimiterOptions(options)),
          ]),
        );
      }
    }

    // Mount streaming (subscription) routes using runtime-specific Hono adapters.
    {
      const mux: XrpcMux = {
        resolveForRequest: (req: Request) => {
          const nsid = parseUrlNsid(req.url);
          if (!nsid) return;
          const sub = this.subscriptions.get(nsid);
          if (!sub) return;
          return {
            handle: (req: Request, socket: WebSocket) => {
              sub.handle(req, socket);
            },
          };
        },
      };

      // Deno
      if (globalThis.Deno?.version?.deno) {
        mountStreamingRoutesDeno(this.app, mux);
      } else if ("WebSocketPair" in globalThis) {
        mountStreamingRoutesWorkers(this.app, mux);
      } else {
        // Node not supported for streaming subscriptions.
      }
    }
  }

  // handlers

  /**
   * Registers a method handler for the specified NSID.
   * @param nsid - The namespace identifier for the method
   * @param configOrFn - Either a handler function or full method configuration
   */
  method(
    nsid: string,
    configOrFn: MethodConfigOrHandler,
  ) {
    this.addMethod(nsid, configOrFn);
  }

  /**
   * Adds a method handler for the specified NSID.
   * @param nsid - The namespace identifier for the method
   * @param configOrFn - Either a handler function or full method configuration
   * @throws {Error} If the method is not found in the lexicon or is not a query/procedure
   */
  addMethod(
    nsid: string,
    configOrFn: MethodConfigOrHandler,
  ) {
    const config = typeof configOrFn === "function"
      ? { handler: configOrFn }
      : configOrFn;
    const def = this.lex.getDef(nsid);
    if (!def || (def.type !== "query" && def.type !== "procedure")) {
      throw new Error(`Method not found in lexicon: ${nsid}`);
    }
    this.addRoute(nsid, def, config);
  }

  /**
   * Registers a streaming method handler for the specified NSID.
   * @param nsid - The namespace identifier for the streaming method
   * @param configOrFn - Either a stream handler function or full stream configuration
   */
  streamMethod(
    nsid: string,
    configOrFn: StreamConfigOrHandler,
  ) {
    this.addStreamMethod(nsid, configOrFn);
  }

  /**
   * Adds a streaming method handler for the specified NSID.
   * @param nsid - The namespace identifier for the streaming method
   * @param configOrFn - Either a stream handler function or full stream configuration
   * @throws {Error} If the subscription is not found in the lexicon
   */
  addStreamMethod(
    nsid: string,
    configOrFn: StreamConfigOrHandler,
  ) {
    const config = typeof configOrFn === "function"
      ? { handler: configOrFn }
      : configOrFn;
    const def = this.lex.getDef(nsid);
    if (!def || def.type !== "subscription") {
      throw new Error(`Subscription not found in lexicon: ${nsid}`);
    }
    this.addSubscription(nsid, def, config);
  }

  // lexicon

  /**
   * Adds a lexicon document to the server's schema registry.
   * @param doc - The lexicon document to add
   */
  addLexicon(doc: LexiconDoc) {
    this.lex.add(doc);
  }

  /**
   * Adds multiple lexicon documents to the server's schema registry.
   * @param docs - Array of lexicon documents to add
   */
  addLexicons(docs: LexiconDoc[]) {
    for (const doc of docs) {
      this.addLexicon(doc);
    }
  }

  // routes

  /**
   * Adds an HTTP route for the specified method.
   * @param nsid - The namespace identifier for the method
   * @param def - The lexicon definition for the method
   * @param config - The method configuration including handler and options
   * @protected
   */
  protected addRoute(
    nsid: string,
    def: LexXrpcQuery | LexXrpcProcedure,
    config: MethodConfig,
  ) {
    const path = `/xrpc/${nsid}`;
    const handler = this.createHandler(nsid, def, config);

    if (def.type === "procedure") {
      this.app.post(path, handler);
    } else {
      this.app.get(path, handler);
    }
  }

  /**
   * Catchall handler that processes all XRPC routes and applies global rate limiting.
   */
  catchall: CatchallHandler = async (c, next) => {
    if (!c.req.url.includes("/xrpc/")) {
      return await next();
    }

    // Validate the NSID
    const nsid = parseUrlNsid(c.req.url);
    if (!nsid) {
      throw new InvalidRequestError("invalid xrpc path");
    }

    if (this.globalRateLimiter) {
      try {
        await this.globalRateLimiter.handle({
          req: c.req.raw,
          res: new Response(),
          auth: undefined,
          params: {},
          input: undefined,
          async resetRouteRateLimits(): Promise<void> {
            // Global rate limits don't have route-specific resets
          },
        });
      } catch {
        return await next();
      }
    }

    // Ensure that known XRPC methods are only called with the correct HTTP
    // method.
    const def = this.lex.getDef(nsid);
    if (def) {
      const expectedMethod = def.type === "procedure"
        ? "POST"
        : def.type === "query"
        ? "GET"
        : null;
      if (expectedMethod != null && expectedMethod !== c.req.method) {
        throw new InvalidRequestError(
          `Incorrect HTTP method (${c.req.method}) expected ${expectedMethod}`,
        );
      }
    }

    if (this.options.catchall) {
      return await this.options.catchall(c, next);
    } else if (!def) {
      throw new MethodNotImplementedError();
    } else {
      return await next();
    }
  };

  /**
   * Creates a parameter verification function for the given method definition.
   * @param _nsid - The namespace identifier (unused)
   * @param def - The lexicon definition containing parameter schema
   * @returns A function that validates and transforms query parameters
   * @protected
   */
  protected createParamsVerifier(
    nsid: string,
    def: LexXrpcQuery | LexXrpcProcedure | LexXrpcSubscription,
  ): (req: Request) => Params {
    return (req: Request): Params => {
      const queryParams = getQueryParams(req.url);
      const params: Params = decodeQueryParams(def, queryParams);
      try {
        return this.lex.assertValidXrpcParams(nsid, params) as Params;
      } catch (e) {
        throw new InvalidRequestError(String(e));
      }
    };
  }

  /**
   * Creates an input verification function for the given method definition.
   * @param nsid - The namespace identifier for the method
   * @param def - The lexicon definition containing input schema
   * @returns A function that validates and transforms request input
   * @protected
   */
  protected createInputVerifier(
    nsid: string,
    def: LexXrpcQuery | LexXrpcProcedure,
    routeOpts: RouteOptions,
  ): (req: Request) => Awaitable<Input> {
    return createInputVerifier(nsid, def, routeOpts, this.lex);
  }

  /**
   * Creates an authentication verification function.
   * @param cfg - Configuration containing optional authentication verifier
   * @returns A function that performs authentication for the method
   * @protected
   */
  protected createAuthVerifier<C, A extends Auth>(cfg: {
    auth?: AuthVerifier<C, A & AuthResult>;
  }): ((ctx: C) => Promise<A>) | null {
    const { auth } = cfg;
    if (!auth) return null;

    return async (ctx: C) => {
      const result = await auth(ctx);
      return excludeErrorResult(result);
    };
  }

  /**
   * Creates a Hono handler function for the specified XRPC method.
   * @template A - The authentication type
   * @param nsid - The namespace identifier for the method
   * @param def - The lexicon definition for the method
   * @param routeCfg - The method configuration including handler and options
   * @returns A Hono handler function
   */
  createHandler<A extends Auth = Auth>(
    nsid: string,
    def: LexXrpcQuery | LexXrpcProcedure,
    cfg: MethodConfig<A>,
  ): Handler {
    const authVerifier = this.createAuthVerifier(cfg);
    const paramsVerifier = this.createParamsVerifier(nsid, def);
    const inputVerifier = this.createInputVerifier(nsid, def, {
      blobLimit: cfg.opts?.blobLimit ?? this.options.payload?.blobLimit,
      jsonLimit: cfg.opts?.jsonLimit ?? this.options.payload?.jsonLimit,
      textLimit: cfg.opts?.textLimit ?? this.options.payload?.textLimit,
    });
    const validateOutputFn = (output?: HandlerSuccess) =>
      this.options.validateResponse && output && def.output
        ? validateOutput(nsid, def, output, this.lex)
        : undefined;

    const routeLimiter = this.createRouteRateLimiter(nsid, cfg);

    return async (c: Context) => {
      try {
        const params = paramsVerifier(c.req.raw);

        const auth: A = authVerifier
          ? await authVerifier({ req: c.req.raw, res: c.res, params })
          : (undefined as A);

        let input: Input = undefined;
        if (def.type === "procedure") {
          input = await inputVerifier(c.req.raw);
        }

        const ctx: HandlerContext<A> = {
          req: c.req.raw,
          res: new Response(),
          params,
          input,
          auth: auth as A,
          resetRouteRateLimits: async () => {
            if (routeLimiter) {
              await routeLimiter.reset(ctx);
            }
          },
        };

        // Apply rate limiting (route-specific, which includes global if configured)
        if (routeLimiter) {
          await routeLimiter.handle(ctx);
        }

        const output = await cfg.handler(ctx);
        if (isErrorResult(output)) {
          throw XRPCError.fromErrorResult(output);
        }

        if (isHandlerPipeThroughBuffer(output)) {
          setHeaders(c, output.headers);
          return c.body(output.buffer.buffer as ArrayBuffer, 200, {
            "Content-Type": output.encoding,
          });
        } else if (isHandlerPipeThroughStream(output)) {
          setHeaders(c, output.headers);
          return c.body(output.stream, 200, {
            "Content-Type": output.encoding,
          });
        }

        if (output) {
          excludeErrorResult(output);
          validateOutputFn(output);
        }

        if (output) {
          setHeaders(c, output.headers);
          if (output.encoding === "application/json") {
            return c.json(ipldToJson(output.body) as JSON);
          } else {
            return c.body(output.body, 200, {
              "Content-Type": output.encoding,
            });
          }
        }

        return c.body(null, 200);
      } catch (err: unknown) {
        throw err || new InternalServerError();
      }
    };
  }

  /**
   * Adds a WebSocket subscription handler for the specified NSID.
   * @param nsid - The namespace identifier for the subscription
   * @param def - The lexicon definition for the subscription
   * @param config - The stream configuration
   * @protected
   */
  protected addSubscription<A extends Auth = Auth>(
    nsid: string,
    def: LexXrpcSubscription,
    cfg: StreamConfig<A>,
  ) {
    const paramsVerifier = this.createParamsVerifier(nsid, def);
    const authVerifier = this.createAuthVerifier(cfg);

    const { handler } = cfg;
    this.subscriptions.set(
      nsid,
      new XrpcStreamServer({
        handler: async function* (req, signal) {
          try {
            // validate request
            const params = paramsVerifier(req);
            // authenticate request
            const auth = authVerifier
              ? await authVerifier({ req, params })
              : (undefined as A);
            // stream
            for await (const item of handler({ req, params, auth, signal })) {
              if (item instanceof Frame) {
                yield item;
                continue;
              }
              const type = (item as Record<string, unknown>)?.["$type"];
              if (!check.is(item, schema.map) || typeof type !== "string") {
                yield new MessageFrame(item);
                continue;
              }
              const split = type.split("#");
              let t: string;
              if (
                split.length === 2 && (split[0] === "" || split[0] === nsid)
              ) {
                t = `#${split[1]}`;
              } else {
                t = type;
              }
              const clone = { ...(item as Record<string, unknown>) };
              delete clone["$type"];
              yield new MessageFrame(clone, { type: t });
            }
          } catch (err) {
            const xrpcError = XRPCError.fromError(err);
            yield new ErrorFrame({
              error: xrpcError.payload.error ?? "Unknown",
              message: xrpcError.payload.message,
            });
          }
        },
      }),
    );
  }

  private createRouteRateLimiter<A extends Auth, C extends HandlerContext>(
    nsid: string,
    config: MethodConfig<A>,
  ): RouteRateLimiter<C> | undefined {
    // @NOTE global & shared rate limiters are instantiated with a context of
    // HandlerContext which is compatible (more generic) with the context of
    // this route specific rate limiters (C). For this reason, it's safe to
    // cast these with an `any` context

    const globalRateLimiter = this.globalRateLimiter as
      | RouteRateLimiter<C>
      | undefined;

    // No route specific rate limiting configured, use the global rate limiter.
    if (!config.rateLimit) return globalRateLimiter;

    const { rateLimits } = this.options;

    // @NOTE Silently ignore creation of route specific rate limiter if the
    // `rateLimits` options was not provided to the constructor.
    if (!rateLimits) return globalRateLimiter;

    const { creator, bypass } = rateLimits;

    const rateLimiters = asArray(config.rateLimit).map((options, i) => {
      if (isSharedRateLimitOpts(options)) {
        const rateLimiter = this.sharedRateLimiters?.get(options.name);

        // The route config references a shared rate limiter that does not
        // exist. This is a configuration error.
        assert(
          rateLimiter,
          `Shared rate limiter "${options.name}" not defined`,
        );

        return WrappedRateLimiter.from<C>(
          rateLimiter as unknown as RateLimiterI<C>,
          options as unknown as WrappedRateLimiterOptions<C>,
        );
      } else {
        return creator({
          ...options,
          calcKey: options.calcKey ?? defaultKey,
          calcPoints: options.calcPoints ?? defaultPoints,
          keyPrefix: `${nsid}-${i}`,
        });
      }
    });

    // If the route config contains an empty array, use global rate limiter.
    if (!rateLimiters.length) return globalRateLimiter;

    // The global rate limiter (if present) should be applied in addition to
    // the route specific rate limiters.
    if (globalRateLimiter) rateLimiters.push(globalRateLimiter);

    return RouteRateLimiter.from<C>(
      rateLimiters as unknown as readonly RateLimiterI<C>[],
      { bypass },
    );
  }

  /**
   * Gets the underlying Hono app instance for external use.
   * @returns The Hono application instance
   */
  get handler(): Hono {
    return this.app;
  }
}

function createErrorHandler(
  opts: Options,
): (err: Error, c: Context) => Response {
  return (err: Error, c: Context): Response => {
    const errorParser = opts.errorParser ||
      ((e: unknown) => XRPCError.fromError(e));
    const xrpcError = errorParser(err);

    const statusCode = "statusCode" in xrpcError
      ? (xrpcError as { statusCode: number }).statusCode
      : 500;

    const payload = xrpcError.payload;
    return c.json(payload, statusCode as 500);
  };
}

function buildRateLimiterOptions<C extends HandlerContext = HandlerContext>({
  name,
  calcKey = defaultKey,
  calcPoints = defaultPoints,
  ...desc
}: ServerRateLimitDescription<C>): RateLimiterOptions<C> {
  return { ...desc, calcKey, calcPoints, keyPrefix: `rl-${name}` };
}

const defaultPoints: CalcPointsFn = (): number => 1;

const defaultKey: CalcKeyFn<HandlerContext> = ({ req }) => {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0]
    : req.headers.get("x-real-ip") ||
      "unknown";
  return ip;
};
