import type { Context, Handler } from "hono";
import { Hono } from "hono";
import { Procedure, Query, Subscription } from "@atp/lex";
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
  type FetchHandler,
  type HandlerContext,
  type HandlerSuccess,
  type Input,
  isHandlerPipeThroughBuffer,
  isHandlerPipeThroughStream,
  isSharedRateLimitOpts,
  type LexMethodConfig,
  type LexMethodConfigWithAuth,
  type LexMethodHandler,
  type LexSubscriptionConfig,
  type LexSubscriptionConfigWithAuth,
  type LexSubscriptionHandler,
  type MethodConfig,
  type MethodConfigOrHandler,
  type MethodConfigWithAuth,
  type Options,
  type Output,
  type Params,
  type ServerRateLimitDescription,
  type StreamConfig,
  type StreamConfigOrHandler,
  type StreamConfigWithAuth,
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
  options?: Options,
): Server;
export function createServer(
  lexicons?: LexiconDoc[],
  options?: Options,
): Server;
export function createServer(
  lexiconsOrOptions?: LexiconDoc[] | Options,
  options?: Options,
): Server {
  if (Array.isArray(lexiconsOrOptions)) {
    return new Server(lexiconsOrOptions, options);
  }
  return new Server(lexiconsOrOptions);
}

/**
 * XRPC server implementation that handles HTTP and WebSocket requests.
 * Manages method registration, authentication, rate limiting, and streaming
 * with automatic schema validation.
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
  handlers: Map<string, FetchHandler> = new Map();
  methods: Map<string, Query | Procedure> = new Map();
  streamMethods: Map<string, Subscription> = new Map();
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
  constructor(options?: Options);
  constructor(lexicons?: LexiconDoc[], opts?: Options);
  constructor(
    lexiconsOrOptions?: LexiconDoc[] | Options,
    opts: Options = {},
  ) {
    this.app = new Hono();
    const lexicons = Array.isArray(lexiconsOrOptions)
      ? lexiconsOrOptions
      : undefined;
    this.options = Array.isArray(lexiconsOrOptions)
      ? opts
      : lexiconsOrOptions ?? {};

    if (lexicons) {
      this.addLexicons(lexicons);
    }

    this.app.use("*", this.catchall);
    this.app.onError(createErrorHandler(this.options));
    this.app.get("/xrpc/_health", async (c) => {
      if (c.req.header("atproto-proxy") != null) {
        throw new InvalidRequestError(
          "atproto-proxy header is not allowed on health check endpoint",
        );
      }
      const healthCheck = this.options.healthCheck;
      const data = healthCheck
        ? await healthCheck(c.req.raw)
        : { status: "ok" };
      return c.json(data);
    });

    this.app.notFound((c) => {
      if (!c.req.url.includes("/xrpc/") && this.options.fallback) {
        return this.options.fallback(c.req.raw) as Promise<Response> | Response;
      }
      const nsid = parseUrlNsid(c.req.url);
      if (nsid) {
        const def = this.getMethodDefinition(nsid);
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

    const rateLimits = this.options.rateLimits;
    if (rateLimits) {
      const { global, shared, creator, bypass } = rateLimits;

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

  private getMainMethod<M extends Query | Procedure | Subscription>(
    methodOrNamespace: M | { main: M },
  ): M {
    if (
      typeof methodOrNamespace === "object" &&
      methodOrNamespace !== null &&
      "main" in methodOrNamespace
    ) {
      return methodOrNamespace.main;
    }
    return methodOrNamespace;
  }

  add<
    M extends Query | Procedure,
    A extends AuthResult,
  >(
    method: M | { main: M },
    configOrFn: LexMethodConfigWithAuth<M, A>,
  ): this;
  add<
    M extends Query | Procedure,
  >(
    method: M | { main: M },
    configOrFn: LexMethodConfig<M, void> | LexMethodHandler<M, void>,
  ): this;
  add<
    M extends Query | Procedure,
    A extends Auth,
  >(
    method: M | { main: M },
    configOrFn: LexMethodConfig<M, A> | LexMethodHandler<M, A>,
  ): this;
  add<
    M extends Subscription,
    A extends AuthResult,
  >(
    method: M | { main: M },
    configOrFn: LexSubscriptionConfigWithAuth<M, A>,
  ): this;
  add<
    M extends Subscription,
  >(
    method: M | { main: M },
    configOrFn:
      | LexSubscriptionConfig<M, void>
      | LexSubscriptionHandler<M, void>,
  ): this;
  add<
    M extends Subscription,
    A extends Auth,
  >(
    method: M | { main: M },
    configOrFn: LexSubscriptionConfig<M, A> | LexSubscriptionHandler<M, A>,
  ): this;
  add(
    method:
      | Query
      | Procedure
      | Subscription
      | { main: Query | Procedure | Subscription },
    configOrFn: unknown,
  ): this {
    const main = this.getMainMethod(
      method as Query | Procedure | Subscription | {
        main: Query | Procedure | Subscription;
      },
    );
    if (this.handlers.has(main.nsid)) {
      throw new TypeError(`Method ${main.nsid} already registered`);
    }

    if (main instanceof Subscription) {
      this.addStreamMethod(main as any, configOrFn as any);
    } else {
      this.addMethod(main as any, configOrFn as any);
    }

    return this;
  }

  /**
   * Registers a method handler for the specified NSID.
   * @param nsid - The namespace identifier for the method
   * @param configOrFn - Either a handler function or full method configuration
   */
  method<
    M extends Query | Procedure,
    A extends AuthResult,
  >(
    method: M,
    configOrFn: LexMethodConfigWithAuth<M, A>,
  ): void;
  method<
    M extends Query | Procedure,
  >(
    method: M,
    configOrFn: LexMethodConfig<M, void> | LexMethodHandler<M, void>,
  ): void;
  method<
    M extends Query | Procedure,
    A extends Auth,
  >(
    method: M,
    configOrFn: LexMethodConfig<M, A> | LexMethodHandler<M, A>,
  ): void;
  method<
    A extends AuthResult,
    P extends Params = Params,
    I extends Input = Input,
    O extends Output = Output,
  >(
    nsid: string,
    configOrFn: MethodConfigWithAuth<A, P, I, O>,
  ): void;
  method<
    A extends Auth,
    P extends Params = Params,
    I extends Input = Input,
    O extends Output = Output,
  >(
    nsid: string,
    configOrFn: MethodConfigOrHandler<A, P, I, O>,
  ): void;
  method(
    nsidOrMethod: string | Query | Procedure,
    configOrFn: unknown,
  ): void {
    if (typeof nsidOrMethod === "string") {
      this.addMethod(nsidOrMethod, configOrFn as MethodConfigOrHandler);
      return;
    }
    this.addMethod(nsidOrMethod as any, configOrFn as any);
  }

  /**
   * Adds a method handler for the specified NSID.
   * @param nsid - The namespace identifier for the method
   * @param configOrFn - Either a handler function or full method configuration
   * @throws {Error} If the method is not found in the lexicon or is not a query/procedure
   */
  addMethod<
    M extends Query | Procedure,
    A extends AuthResult,
  >(
    method: M,
    configOrFn: LexMethodConfigWithAuth<M, A>,
  ): void;
  addMethod<
    M extends Query | Procedure,
  >(
    method: M,
    configOrFn: LexMethodConfig<M, void> | LexMethodHandler<M, void>,
  ): void;
  addMethod<
    M extends Query | Procedure,
    A extends Auth,
  >(
    method: M,
    configOrFn: LexMethodConfig<M, A> | LexMethodHandler<M, A>,
  ): void;
  addMethod<
    A extends AuthResult,
    P extends Params = Params,
    I extends Input = Input,
    O extends Output = Output,
  >(
    nsid: string,
    configOrFn: MethodConfigWithAuth<A, P, I, O>,
  ): void;
  addMethod<
    A extends Auth,
    P extends Params = Params,
    I extends Input = Input,
    O extends Output = Output,
  >(
    nsid: string,
    configOrFn: MethodConfigOrHandler<A, P, I, O>,
  ): void;
  addMethod(
    nsidOrMethod: string | Query | Procedure,
    configOrFn: unknown,
  ): void {
    const config: MethodConfig = typeof configOrFn === "function"
      ? { handler: configOrFn as MethodConfig["handler"] }
      : configOrFn as MethodConfig;

    if (typeof nsidOrMethod !== "string") {
      this.addLexMethod(nsidOrMethod, config);
      return;
    }

    const def = this.lex.getDef(nsidOrMethod);
    if (!def || (def.type !== "query" && def.type !== "procedure")) {
      throw new Error(`Method not found in lexicon: ${nsidOrMethod}`);
    }
    this.addRoute(nsidOrMethod, def, config);
  }

  /**
   * Registers a streaming method handler for the specified NSID.
   * @param nsid - The namespace identifier for the streaming method
   * @param configOrFn - Either a stream handler function or full stream configuration
   */
  streamMethod<
    M extends Subscription,
    A extends AuthResult,
  >(
    method: M,
    configOrFn: LexSubscriptionConfigWithAuth<M, A>,
  ): void;
  streamMethod<
    M extends Subscription,
  >(
    method: M,
    configOrFn:
      | LexSubscriptionConfig<M, void>
      | LexSubscriptionHandler<M, void>,
  ): void;
  streamMethod<
    M extends Subscription,
    A extends Auth,
  >(
    method: M,
    configOrFn: LexSubscriptionConfig<M, A> | LexSubscriptionHandler<M, A>,
  ): void;
  streamMethod<
    A extends AuthResult,
    P extends Params = Params,
    O = unknown,
  >(
    nsid: string,
    configOrFn: StreamConfigWithAuth<A, P, O>,
  ): void;
  streamMethod<
    A extends Auth,
    P extends Params = Params,
    O = unknown,
  >(
    nsid: string,
    configOrFn: StreamConfigOrHandler<A, P, O>,
  ): void;
  streamMethod(
    nsidOrMethod: string | Subscription,
    configOrFn: unknown,
  ): void {
    if (typeof nsidOrMethod === "string") {
      this.addStreamMethod(nsidOrMethod, configOrFn as StreamConfigOrHandler);
      return;
    }
    this.addStreamMethod(nsidOrMethod as any, configOrFn as any);
  }

  /**
   * Adds a streaming method handler for the specified NSID.
   * @param nsid - The namespace identifier for the streaming method
   * @param configOrFn - Either a stream handler function or full stream configuration
   * @throws {Error} If the subscription is not found in the lexicon
   */
  addStreamMethod<
    M extends Subscription,
    A extends AuthResult,
  >(
    method: M,
    configOrFn: LexSubscriptionConfigWithAuth<M, A>,
  ): void;
  addStreamMethod<
    M extends Subscription,
  >(
    method: M,
    configOrFn:
      | LexSubscriptionConfig<M, void>
      | LexSubscriptionHandler<M, void>,
  ): void;
  addStreamMethod<
    M extends Subscription,
    A extends Auth,
  >(
    method: M,
    configOrFn: LexSubscriptionConfig<M, A> | LexSubscriptionHandler<M, A>,
  ): void;
  addStreamMethod<
    A extends AuthResult,
    P extends Params = Params,
    O = unknown,
  >(
    nsid: string,
    configOrFn: StreamConfigWithAuth<A, P, O>,
  ): void;
  addStreamMethod<
    A extends Auth,
    P extends Params = Params,
    O = unknown,
  >(
    nsid: string,
    configOrFn: StreamConfigOrHandler<A, P, O>,
  ): void;
  addStreamMethod(
    nsidOrMethod: string | Subscription,
    configOrFn: unknown,
  ): void {
    const config: StreamConfig = typeof configOrFn === "function"
      ? { handler: configOrFn as StreamConfig["handler"] }
      : configOrFn as StreamConfig;

    if (typeof nsidOrMethod !== "string") {
      this.addLexSubscription(nsidOrMethod, config);
      return;
    }

    const def = this.lex.getDef(nsidOrMethod);
    if (!def || def.type !== "subscription") {
      throw new Error(`Subscription not found in lexicon: ${nsidOrMethod}`);
    }
    this.addSubscription(nsidOrMethod, def, config);
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

    this.handlers.set(nsid, this.fetch);
  }

  protected addLexMethod(
    method: Query | Procedure,
    config: MethodConfig,
  ) {
    const nsid = method.nsid;
    const path = `/xrpc/${nsid}`;
    const handler = this.createLexHandler(method, config);
    this.methods.set(nsid, method);

    if (method instanceof Procedure) {
      this.app.post(path, handler);
    } else {
      this.app.get(path, handler);
    }

    this.handlers.set(nsid, this.fetch);
  }

  /**
   * Catchall handler that processes all XRPC routes and applies global rate limiting.
   */
  catchall: CatchallHandler = async (c, next) => {
    const pathname = new URL(c.req.url).pathname;
    if (!pathname.startsWith("/xrpc/")) {
      return await next();
    }
    if (pathname === "/xrpc/_health") return await next();

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
    const def = this.getMethodDefinition(nsid);
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

  protected createLexInputVerifier(
    method: Query | Procedure,
    routeOpts: RouteOptions,
  ): (req: Request) => Awaitable<Input> {
    if (method instanceof Query) {
      return createInputVerifier(
        method.nsid,
        { type: "query" } as LexXrpcQuery,
        routeOpts,
        this.lex,
      );
    }

    return createInputVerifier(
      method.nsid,
      {
        type: "procedure",
        input: method.input.encoding
          ? { encoding: method.input.encoding }
          : undefined,
      } as LexXrpcProcedure,
      routeOpts,
      this.lex,
    );
  }

  protected createLexParamsVerifier(
    method: Query | Procedure | Subscription,
  ): (req: Request) => Params {
    return (req: Request): Params => {
      try {
        const { searchParams } = new URL(req.url);
        return method.parameters.fromURLSearchParams(searchParams) as Params;
      } catch (e) {
        throw new InvalidRequestError(String(e));
      }
    };
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

  createLexHandler<A extends Auth = Auth>(
    method: Query | Procedure,
    cfg: MethodConfig<A>,
  ): Handler {
    const authVerifier = this.createAuthVerifier(cfg);
    const paramsVerifier = this.createLexParamsVerifier(method);
    const inputVerifier = this.createLexInputVerifier(method, {
      blobLimit: cfg.opts?.blobLimit ?? this.options.payload?.blobLimit,
      jsonLimit: cfg.opts?.jsonLimit ?? this.options.payload?.jsonLimit,
      textLimit: cfg.opts?.textLimit ?? this.options.payload?.textLimit,
    });
    const validateOutputFn = (output?: HandlerSuccess) =>
      this.options.validateResponse && output
        ? this.validateLexOutput(method, output)
        : undefined;

    const routeLimiter = this.createRouteRateLimiter(method.nsid, cfg);

    return async (c: Context) => {
      try {
        const params = paramsVerifier(c.req.raw);

        const auth: A = authVerifier
          ? await authVerifier({ req: c.req.raw, res: c.res, params })
          : (undefined as A);

        let input: Input = undefined;
        if (method instanceof Procedure) {
          input = await inputVerifier(c.req.raw);
          if (input && method.input.schema) {
            const result = method.input.schema.safeParse(input.body);
            if (!result.success) {
              throw new InvalidRequestError(result.error.message);
            }
            input = { ...input, body: result.value };
          }
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
    this.handlers.set(nsid, this.fetch);
  }

  protected addLexSubscription<A extends Auth = Auth>(
    method: Subscription,
    cfg: StreamConfig<A>,
  ) {
    const paramsVerifier = this.createLexParamsVerifier(method);
    const authVerifier = this.createAuthVerifier(cfg);
    const nsid = method.nsid;
    const { handler } = cfg;
    this.streamMethods.set(nsid, method);

    this.subscriptions.set(
      nsid,
      new XrpcStreamServer({
        handler: async function* (req, signal) {
          try {
            const params = paramsVerifier(req);
            const auth = authVerifier
              ? await authVerifier({ req, params })
              : (undefined as A);

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
    this.handlers.set(nsid, this.fetch);
  }

  protected validateLexOutput(
    method: Query | Procedure,
    output: HandlerSuccess | void,
  ) {
    const expected = method.output.encoding;

    if (expected === undefined) {
      if (output !== undefined) {
        throw new InternalServerError(
          "A response body was provided when none was expected",
        );
      }
      return;
    }

    if (output === undefined) {
      throw new InternalServerError(
        "A response body is expected but none was provided",
      );
    }

    if (!matchesEncoding(expected, output.encoding)) {
      throw new InternalServerError(
        `Invalid response encoding: ${output.encoding}`,
      );
    }

    if (method.output.schema) {
      const result = method.output.schema.safeParse(output.body);
      if (!result.success) {
        throw new InternalServerError(result.error.message);
      }
      output.body = result.value;
    }
  }

  private getMethodDefinition(
    nsid: string,
  ): undefined | { type: "query" | "procedure" | "subscription" } {
    const method = this.methods.get(nsid);
    if (method) {
      return method instanceof Procedure
        ? { type: "procedure" }
        : { type: "query" };
    }

    if (this.streamMethods.has(nsid)) {
      return { type: "subscription" };
    }

    const def = this.lex.getDef(nsid);
    if (
      def &&
      (def.type === "query" || def.type === "procedure" ||
        def.type === "subscription")
    ) {
      return { type: def.type };
    }

    return undefined;
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

  fetch: FetchHandler = async (request: Request): Promise<Response> => {
    return await this.handler.fetch(request);
  };

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
): (err: Error, c: Context) => Promise<Response> {
  return async (err: Error, c: Context): Promise<Response> => {
    const errorParser = opts.errorParser ||
      ((e: unknown) => XRPCError.fromError(e));
    const xrpcError = errorParser(err);
    const nsid = parseUrlNsid(c.req.url) ?? undefined;

    if (opts.onHandlerError) {
      await opts.onHandlerError({
        error: xrpcError,
        request: c.req.raw,
        nsid,
      });
    }

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

function matchesEncoding(expected: string, actual: string): boolean {
  const normalizedExpected = normalizeEncoding(expected);
  const normalizedActual = normalizeEncoding(actual);

  if (normalizedExpected === "*/*") {
    return true;
  }

  const [expectedType, expectedSubtype] = normalizedExpected.split("/");
  const [actualType, actualSubtype] = normalizedActual.split("/");

  if (
    expectedType == null ||
    expectedSubtype == null ||
    actualType == null ||
    actualSubtype == null
  ) {
    return false;
  }

  if (expectedType !== "*" && expectedType !== actualType) {
    return false;
  }

  if (expectedSubtype !== "*" && expectedSubtype !== actualSubtype) {
    return false;
  }

  return true;
}

function normalizeEncoding(encoding: string): string {
  return encoding.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}
