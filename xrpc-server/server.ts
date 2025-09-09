import type { Context, Handler } from "hono";
import { Hono } from "hono";
import {
  type LexiconDoc,
  Lexicons,
  type LexXrpcProcedure,
  type LexXrpcQuery,
  type LexXrpcSubscription,
} from "@atproto/lexicon";
import {
  excludeErrorResult,
  InternalServerError,
  InvalidRequestError,
  isErrorResult,
  MethodNotImplementedError,
  XRPCError,
} from "./errors.ts";
import {
  type RateLimiterI,
  RateLimitExceededError,
  RouteRateLimiter,
} from "./rate-limiter.ts";
import { ErrorFrame, XrpcStreamServer } from "./stream/index.ts";
import {
  type Auth,
  type HandlerContext,
  type HandlerSuccess,
  type Input,
  isHandlerPipeThroughBuffer,
  isHandlerPipeThroughStream,
  isSharedRateLimitOpts,
  type MethodAuthVerifier,
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
  decodeUrlQueryParams,
  getQueryParams,
  parseUrlNsid,
  setHeaders,
  validateOutput,
} from "./util.ts";
import {
  type CalcKeyFn,
  type CalcPointsFn,
  type RateLimiterOptions,
  WrappedRateLimiter,
  type WrappedRateLimiterOptions,
} from "./rate-limiter.ts";
import type { CatchallHandler, HandlerInput } from "./types.ts";
import { assert } from "@std/assert";

/**
 * Creates a new XRPC server instance.
 * @param lexicons - Optional array of lexicon documents to initialize the server with
 * @param options - Optional server configuration options
 * @returns A new Server instance
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

    // Add global middleware
    this.app.use("*", this.catchall);
    this.app.onError(createErrorHandler(opts));

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
  }

  // handlers
  // =

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
  // =

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
  // =

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
   * Only applies to routes starting with "/xrpc/".
   */
  catchall: CatchallHandler = async (c, next) => { // catchall handler only applies to XRPC routes
    if (!c.req.url.startsWith("/xrpc/")) return next();

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
          async resetRouteRateLimits() {},
        });
      } catch {
        return next();
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
      await this.options.catchall(c, next);
    } else if (!def) {
      throw new MethodNotImplementedError();
    } else {
      await next();
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
    _nsid: string,
    def: LexXrpcQuery | LexXrpcProcedure | LexXrpcSubscription,
  ): (query: Record<string, unknown>) => Params {
    if (!def.parameters) {
      return () => ({});
    }
    return (query: Record<string, unknown>) => {
      return query as Params;
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
  ): (req: Request) => Promise<HandlerInput | undefined> {
    return createInputVerifier(this.lex, nsid, def);
  }

  /**
   * Creates an authentication verification function.
   * @param _nsid - The namespace identifier (unused)
   * @param verifier - Optional custom authentication verifier
   * @returns A function that performs authentication for the method
   * @protected
   */
  protected createAuthVerifier(
    _nsid: string,
    verifier?: MethodAuthVerifier,
  ): (params: Params, input: Input, req: Request) => Promise<Auth> {
    return async (
      params: Params,
      input: Input,
      req: Request,
    ): Promise<Auth> => {
      if (verifier) {
        return await verifier({
          params,
          input,
          req,
          res: new Response(),
        });
      }
      return undefined;
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
    routeCfg: MethodConfig<A>,
  ): Handler {
    const verifyParams = this.createParamsVerifier(nsid, def);
    const verifyInput = this.createInputVerifier(nsid, def);
    const verifyAuth = this.createAuthVerifier(nsid, routeCfg.auth);
    const validateReqNSID = () => nsid;
    const validateOutputFn = (output?: HandlerSuccess) =>
      this.options.validateResponse && output && def.output
        ? validateOutput(nsid, def, output, this.lex)
        : undefined;

    const routeLimiter = this.createRouteRateLimiter(nsid, routeCfg);

    return async (c: Context) => {
      try {
        validateReqNSID();

        const query = getQueryParams(c.req.url);
        const params = verifyParams(decodeUrlQueryParams(query));

        let input: Input = undefined;
        if (def.type === "procedure") {
          input = await verifyInput(c.req.raw);
        }

        const auth = await verifyAuth(params, input, c.req.raw);

        const ctx: HandlerContext<A> = {
          req: c.req.raw,
          res: new Response(),
          params,
          input,
          auth: auth as A,
          resetRouteRateLimits: async () => {},
        };

        if (routeLimiter) {
          const result = await routeLimiter.consume(ctx);
          if (result instanceof RateLimitExceededError) {
            throw result;
          }
        }

        const output = await routeCfg.handler(ctx);
        if (isErrorResult(output)) {
          throw output.error;
        }

        if (isHandlerPipeThroughBuffer(output)) {
          setHeaders(c, output.headers);
          return c.body(new Uint8Array(output.buffer), 200, {
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
            return c.json(output.body);
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
   * @param _def - The lexicon definition for the subscription (unused)
   * @param _config - The stream configuration (unused)
   * @protected
   */
  protected addSubscription(
    nsid: string,
    _def: LexXrpcSubscription,
    _config: StreamConfig,
  ) {
    const server = new XrpcStreamServer({
      noServer: true,
      handler: async function* (_req: Request, _signal: AbortSignal) {
        // Stream handler implementation would go here
        yield new ErrorFrame({
          error: "NotImplemented",
          message: "Streaming not implemented",
        });
      },
    });

    this.subscriptions.set(nsid, server);
  }

  /**
   * Creates a route-specific rate limiter based on the method configuration.
   * @template A - The authentication type
   * @template C - The handler context type
   * @param nsid - The namespace identifier for the method
   * @param config - The method configuration containing rate limit options
   * @returns A route rate limiter or undefined if no rate limiting is configured
   * @private
   */
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

/**
 * Creates an error handler function for the Hono application.
 * @param opts - Server options containing optional error parser
 * @returns An error handler function that converts errors to XRPC error responses
 */
function createErrorHandler(opts: Options) {
  return (err: Error, c: Context) => {
    const errorParser = opts.errorParser ||
      ((e: unknown) => XRPCError.fromError(e));
    const xrpcError = errorParser(err);

    const statusCode = "statusCode" in xrpcError
      ? (xrpcError as { statusCode: number }).statusCode
      : 500;

    return c.json(
      {
        error: xrpcError.type || "InternalServerError",
        message: xrpcError.message || "Internal Server Error",
      },
      statusCode as 500,
    );
  };
}

/**
 * Type guard to check if an object is a Pino HTTP request object.
 * @param obj - The object to check
 * @returns True if the object has a req property
 * @private
 */
function _isPinoHttpRequest(obj: unknown): obj is {
  req: unknown;
} {
  return (
    !!obj &&
    typeof obj === "object" &&
    "req" in obj
  );
}

/**
 * Converts an error to a simplified error-like object for logging.
 * @param err - The error to convert
 * @returns A simplified error object or the original value
 * @private
 */
function _toSimplifiedErrorLike(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return err;
}

/**
 * Builds rate limiter options from a server rate limit description.
 * @template C - The handler context type
 * @param options - The server rate limit description
 * @returns Rate limiter options with defaults applied
 */
function buildRateLimiterOptions<C extends HandlerContext = HandlerContext>({
  name,
  calcKey = defaultKey,
  calcPoints = defaultPoints,
  ...desc
}: ServerRateLimitDescription<C>): RateLimiterOptions<C> {
  return { ...desc, calcKey, calcPoints, keyPrefix: `rl-${name}` };
}

/**
 * Default function for calculating rate limit points consumed per request.
 * Always returns 1 point per request.
 */
const defaultPoints: CalcPointsFn = () => 1;

/**
 * Default function for calculating rate limit keys based on client IP address.
 * Extracts IP from X-Forwarded-For, X-Real-IP headers, or falls back to "unknown".
 *
 * @note When using a proxy, ensure headers are getting forwarded correctly:
 * `app.set('trust proxy', true)`
 *
 * @see {@link https://expressjs.com/en/guide/behind-proxies.html}
 */
const defaultKey: CalcKeyFn<HandlerContext> = ({ req }) => {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0]
    : req.headers.get("x-real-ip") ||
      "unknown";
  return ip;
};
