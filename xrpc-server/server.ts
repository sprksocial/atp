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
  type HandlerContext,
  type HandlerSuccess,
  type Input,
  isHandlerPipeThroughBuffer,
  isHandlerPipeThroughStream,
  isSharedRateLimitOpts,
  type LexMethodConfig,
  type LexMethodHandler,
  type LexMethodInput,
  type LexMethodLike,
  type LexMethodOutput,
  type LexMethodParams,
  type LexSubscriptionConfig,
  type LexSubscriptionHandler,
  type MethodConfig,
  type MethodConfigOrHandler,
  type MethodHandler,
  type Options,
  type Output,
  type Params,
  type ServerRateLimitDescription,
  type StreamConfig,
  type StreamConfigOrHandler,
  type StreamContext,
} from "./types.ts";
import {
  asArray,
  createLexiconInputVerifier,
  createLexiconParamsVerifier,
  createSchemaInputVerifier,
  createSchemaOutputVerifier,
  createSchemaParamsVerifier,
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

type LexAddConfig<M extends Procedure | Query | Subscription> = M extends
  Procedure | Query ? LexMethodConfig<M, Auth> | LexMethodHandler<M, void>
  : M extends Subscription
    ? LexSubscriptionConfig<M, Auth> | LexSubscriptionHandler<M, void>
  : never;

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
  methodTypes: Map<string, "procedure" | "query" | "subscription"> = new Map<
    string,
    "procedure" | "query" | "subscription"
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
        const methodType = this.methodTypes.get(nsid) ??
          this.lex.getDef(nsid)?.type;
        if (methodType) {
          const expectedMethod = methodType === "procedure"
            ? "POST"
            : methodType === "query"
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

  add<M extends Procedure | Query | Subscription>(
    method: LexMethodLike<M>,
    configOrHandler: LexAddConfig<M>,
  ): void {
    const schema = getLexMethod(method);
    const config = typeof configOrHandler === "function"
      ? { handler: configOrHandler }
      : configOrHandler;

    if (schema instanceof Procedure) {
      return this.addProcedureSchema(
        schema,
        config as LexMethodConfig<Procedure, Auth>,
      );
    }

    if (schema instanceof Query) {
      return this.addQuerySchema(
        schema,
        config as LexMethodConfig<Query, Auth>,
      );
    }

    return this.addSubscriptionSchema(
      schema,
      config as LexSubscriptionConfig<Subscription, Auth>,
    );
  }

  protected addProcedureSchema<M extends Procedure, A extends Auth>(
    schema: M,
    config: LexMethodConfig<M, A>,
  ): void {
    this.app.post(
      `/xrpc/${schema.nsid}`,
      this.createHandlerInternal<
        A,
        LexMethodParams<M>,
        LexMethodInput<M>,
        LexMethodOutput<M>
      >(
        this.createAuthVerifier(config),
        this.createSchemaParamsVerifier(schema),
        this.createSchemaInputVerifier(schema, config.opts),
        this.createRouteRateLimiter(schema.nsid, config),
        config.handler,
        this.createSchemaOutputVerifier(schema),
      ),
    );
    this.methodTypes.set(schema.nsid, "procedure");
  }

  protected addQuerySchema<M extends Query, A extends Auth>(
    schema: M,
    config: LexMethodConfig<M, A>,
  ): void {
    this.app.get(
      `/xrpc/${schema.nsid}`,
      this.createHandlerInternal<
        A,
        LexMethodParams<M>,
        LexMethodInput<M>,
        LexMethodOutput<M>
      >(
        this.createAuthVerifier(config),
        this.createSchemaParamsVerifier(schema),
        this.createSchemaInputVerifier(schema, config.opts),
        this.createRouteRateLimiter(schema.nsid, config),
        config.handler,
        this.createSchemaOutputVerifier(schema),
      ),
    );
    this.methodTypes.set(schema.nsid, "query");
  }

  protected addSubscriptionSchema<M extends Subscription, A extends Auth>(
    schema: M,
    config: LexSubscriptionConfig<M, A>,
  ): void {
    const { handler } = config;
    const messageSchema = this.options.validateResponse === false
      ? undefined
      : schema.message;

    return this.addSubscriptionInternal(
      schema.nsid,
      this.createSchemaParamsVerifier(schema),
      this.createAuthVerifier(config),
      messageSchema
        ? async function* (ctx) {
          for await (const rawItem of handler(ctx)) {
            const item = rawItem as unknown;
            if (item instanceof MessageFrame) {
              yield validateMessageFrame(item, messageSchema, schema.nsid);
              continue;
            }
            if (item instanceof Frame) {
              yield item;
              continue;
            }
            yield messageSchema.parse(item);
          }
        }
        : handler,
    );
  }

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
    this.methodTypes.set(nsid, def.type);

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
    const methodType = this.methodTypes.get(nsid) ??
      this.lex.getDef(nsid)?.type;
    if (methodType) {
      const expectedMethod = methodType === "procedure"
        ? "POST"
        : methodType === "query"
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
    } else if (!methodType) {
      throw new MethodNotImplementedError();
    } else {
      return await next();
    }
  };

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

  private createLexiconParamsVerifier(
    nsid: string,
    def: LexXrpcQuery | LexXrpcProcedure | LexXrpcSubscription,
  ): (req: Request) => Params {
    return createLexiconParamsVerifier(nsid, def, this.lex);
  }

  private createLexiconInputVerifier(
    nsid: string,
    def: LexXrpcQuery | LexXrpcProcedure,
    opts?: RouteOptions,
  ): (req: Request) => Input | Promise<Input> {
    return createLexiconInputVerifier(
      nsid,
      def,
      {
        blobLimit: opts?.blobLimit ?? this.options.payload?.blobLimit,
        jsonLimit: opts?.jsonLimit ?? this.options.payload?.jsonLimit,
        textLimit: opts?.textLimit ?? this.options.payload?.textLimit,
      },
      this.lex,
    );
  }

  private createLexiconOutputVerifier(
    nsid: string,
    def: LexXrpcQuery | LexXrpcProcedure,
  ): null | ((output: HandlerSuccess | void) => void) {
    if (this.options.validateResponse === false) {
      return null;
    }

    return (output) => validateOutput(nsid, def, output, this.lex);
  }

  private createSchemaParamsVerifier<
    M extends Procedure | Query | Subscription,
  >(
    method: M,
  ): (req: Request) => LexMethodParams<M> {
    return createSchemaParamsVerifier(method);
  }

  private createSchemaInputVerifier<M extends Procedure | Query>(
    method: M,
    opts?: RouteOptions,
  ): (req: Request) => LexMethodInput<M> | Promise<LexMethodInput<M>> {
    return createSchemaInputVerifier(method, {
      blobLimit: opts?.blobLimit ?? this.options.payload?.blobLimit,
      jsonLimit: opts?.jsonLimit ?? this.options.payload?.jsonLimit,
      textLimit: opts?.textLimit ?? this.options.payload?.textLimit,
    });
  }

  private createSchemaOutputVerifier<M extends Procedure | Query>(
    method: M,
  ): null | ((output: LexMethodOutput<M>) => void) {
    if (this.options.validateResponse === false) {
      return null;
    }

    return createSchemaOutputVerifier(method);
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
    return this.createHandlerInternal<A, Params, Input, HandlerSuccess | void>(
      this.createAuthVerifier(cfg),
      this.createLexiconParamsVerifier(nsid, def),
      this.createLexiconInputVerifier(nsid, def, cfg.opts),
      this.createRouteRateLimiter(nsid, cfg),
      cfg.handler as MethodHandler<A, Params, Input, HandlerSuccess | void>,
      this.createLexiconOutputVerifier(nsid, def),
    );
  }

  protected createHandlerInternal<
    A extends Auth,
    P extends Params,
    I extends Input,
    O extends HandlerSuccess | void,
  >(
    authVerifier:
      | null
      | ((ctx: { req: Request; res: Response; params: P }) => Promise<A>),
    paramsVerifier: (req: Request) => P,
    inputVerifier: (req: Request) => I | Promise<I>,
    routeLimiter: RouteRateLimiter<HandlerContext<A, P, I>> | undefined,
    handler: MethodHandler<A, P, I, O>,
    validateOutput:
      | null
      | ((output: O) => void),
  ): Handler {
    return async (c: Context) => {
      try {
        const params = paramsVerifier(c.req.raw);

        const auth: A = authVerifier
          ? await authVerifier({ req: c.req.raw, res: c.res, params })
          : (undefined as A);

        const input = await inputVerifier(c.req.raw);

        const ctx: HandlerContext<A, P, I> = {
          req: c.req.raw,
          res: new Response(),
          params,
          input,
          auth,
          resetRouteRateLimits: async () => {
            if (routeLimiter) {
              await routeLimiter.reset(ctx);
            }
          },
        };

        if (routeLimiter) {
          await routeLimiter.handle(ctx);
        }

        const output = await handler(ctx);

        if (output === undefined) {
          validateOutput?.(output);
          return c.body(null, 200);
        }

        if (isErrorResult(output)) {
          throw XRPCError.fromErrorResult(output);
        }

        if (isHandlerPipeThroughBuffer(output)) {
          setHeaders(c, output.headers);
          return c.body(output.buffer.buffer as ArrayBuffer, 200, {
            "Content-Type": output.encoding,
          });
        }

        if (isHandlerPipeThroughStream(output)) {
          setHeaders(c, output.headers);
          return c.body(output.stream, 200, {
            "Content-Type": output.encoding,
          });
        }

        const successOutput = output as HandlerSuccess;
        validateOutput?.(successOutput as O);
        setHeaders(c, successOutput.headers);

        if (successOutput.encoding === "application/json") {
          return c.json(ipldToJson(successOutput.body) as JSON);
        }

        return c.body(successOutput.body, 200, {
          "Content-Type": successOutput.encoding,
        });
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
    this.addSubscriptionInternal(
      nsid,
      this.createLexiconParamsVerifier(nsid, def),
      this.createAuthVerifier(cfg),
      cfg.handler,
    );
  }

  protected addSubscriptionInternal<A extends Auth, P extends Params>(
    nsid: string,
    paramsVerifier: (req: Request) => P,
    authVerifier:
      | null
      | ((ctx: { req: Request; params: P }) => Promise<A>),
    handler: (ctx: StreamContext<A, P>) => AsyncIterable<unknown>,
  ): void {
    this.methodTypes.set(nsid, "subscription");
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
              yield item instanceof Frame
                ? item
                : messageFrameFromValue(item, nsid);
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

  private createRouteRateLimiter<
    A extends Auth,
    P extends Params,
    I extends Input,
    O extends Output,
    C extends HandlerContext<A, P, I> = HandlerContext<A, P, I>,
  >(
    nsid: string,
    config: MethodConfig<A, P, I, O>,
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

function getLexMethod<M extends Procedure | Query | Subscription>(
  method: LexMethodLike<M>,
): M {
  if (isLexMethod(method)) {
    return method;
  }

  if ("main" in method && isLexMethod(method.main)) {
    return method.main;
  }

  if ("Main" in method && isLexMethod(method.Main)) {
    return method.Main;
  }

  throw new TypeError(
    "Expected a lex method or a namespace with main/Main",
  );
}

function isLexMethod(
  value: unknown,
): value is Procedure | Query | Subscription {
  return value instanceof Procedure ||
    value instanceof Query ||
    value instanceof Subscription;
}

function messageFrameFromValue(
  value: unknown,
  nsid: string,
): MessageFrame<unknown> {
  const type = (value as Record<string, unknown>)?.["$type"];
  if (!check.is(value, schema.map) || typeof type !== "string") {
    return new MessageFrame(value);
  }

  const split = type.split("#");
  let t: string;
  if (split.length === 2 && (split[0] === "" || split[0] === nsid)) {
    t = `#${split[1]}`;
  } else {
    t = type;
  }

  const clone = { ...(value as Record<string, unknown>) };
  delete clone["$type"];
  return new MessageFrame(clone, { type: t });
}

function validateMessageFrame(
  frame: MessageFrame<unknown>,
  messageSchema: { parse(input: unknown): unknown },
  nsid: string,
): MessageFrame<unknown> {
  const parsedBody = parseMessageBody(
    frame.body,
    frame.type,
    messageSchema,
    nsid,
  );
  frame.body = stripMessageType(parsedBody, frame.type, nsid);
  return frame;
}

function parseMessageBody(
  value: unknown,
  type: string | undefined,
  messageSchema: { parse(input: unknown): unknown },
  nsid: string,
): unknown {
  let lastError: unknown;

  for (const candidate of getMessageValueCandidates(value, type, nsid)) {
    try {
      return messageSchema.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function getMessageValueCandidates(
  value: unknown,
  type: string | undefined,
  nsid: string,
): unknown[] {
  if (type === undefined || !check.is(value, schema.map)) {
    return [value];
  }

  return getMessageTypeCandidates(type, nsid).map((candidateType) => ({
    ...(value as Record<string, unknown>),
    $type: candidateType,
  }));
}

function getMessageTypeCandidates(type: string, nsid: string): string[] {
  const candidates: string[] = [];
  const normalized = normalizeMessageType(type, nsid);
  const absolute = normalized.startsWith("#") ? `${nsid}${normalized}` : type;

  for (const candidate of [type, normalized, absolute]) {
    if (!candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

function stripMessageType(
  value: unknown,
  type: string | undefined,
  nsid: string,
): unknown {
  const body = value as Record<string, unknown>;
  if (
    type === undefined ||
    !check.is(value, schema.map) ||
    typeof body["$type"] !== "string" ||
    normalizeMessageType(body["$type"], nsid) !==
      normalizeMessageType(type, nsid)
  ) {
    return value;
  }

  const clone = { ...body };
  delete clone["$type"];
  return clone;
}

function normalizeMessageType(type: string, nsid: string): string {
  const split = type.split("#");
  if (split.length === 2 && (split[0] === "" || split[0] === nsid)) {
    return `#${split[1]}`;
  }
  return type;
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
