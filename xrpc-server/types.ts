import type { Context, HonoRequest, Next } from "hono";
import { z } from "zod";
import type { ErrorResult, XRPCError } from "./errors.ts";
import type { CalcKeyFn, CalcPointsFn } from "./rate-limiter.ts";
import type { RateLimiterI } from "./rate-limiter.ts";

/**
 * Represents a value that can be either synchronous or asynchronous.
 * @template T - The type of the value
 */
export type Awaitable<T> = T | Promise<T>;

/**
 * Handler function for catching all unmatched routes.
 * @param c - The Hono context object
 * @param next - The next middleware function
 * @returns A promise that resolves to void or a Response
 */
export type CatchallHandler = (
  c: Context,
  next: Next,
) => Promise<void | Response>;

/**
 * Configuration options for the XRPC server.
 */
export type Options = {
  /** Whether to validate response schemas */
  validateResponse?: boolean;
  /** Handler for catching all unmatched routes */
  catchall?: CatchallHandler;
  /** Payload size limits for different content types */
  payload?: RouteOptions;
  /** Rate limiting configuration */
  rateLimits?: {
    /** Factory function for creating rate limiters */
    creator: RateLimiterCreator<HandlerContext>;
    /** Global rate limits applied to all routes */
    global?: ServerRateLimitDescription<HandlerContext>[];
    /** Shared rate limits that can be referenced by name */
    shared?: ServerRateLimitDescription<HandlerContext>[];
    /** Function to determine if rate limits should be bypassed for a request */
    bypass?: (ctx: HandlerContext) => boolean;
  };
  /**
   * By default, errors are converted to {@link XRPCError} using
   * {@link XRPCError.fromError} before being rendered. If method handlers throw
   * error objects that are not properly rendered in the HTTP response, this
   * function can be used to properly convert them to {@link XRPCError}. The
   * provided function will typically fallback to the default error conversion
   * (`return XRPCError.fromError(err)`) if the error is not recognized.
   *
   * @note This function should not throw errors.
   */
  errorParser?: (err: unknown) => XRPCError;
};

/**
 * Raw query parameters from the HTTP request before type conversion.
 */
export type UndecodedParams = HonoRequest["query"];

/**
 * Basic primitive types supported in XRPC parameters.
 */
export type Primitive = string | number | boolean;

/**
 * Type-safe parameter object with optional primitive values or arrays.
 */
export type Params = { [P in string]?: undefined | Primitive | Primitive[] };

/**
 * Input data for XRPC method handlers.
 */
export type HandlerInput = {
  /** Content encoding of the request body */
  encoding: string;
  /** Parsed request body */
  body: unknown;
};

/**
 * Result of successful authentication.
 */
export type AuthResult = {
  /** Authentication credentials (e.g., user info, tokens) */
  credentials: unknown;
  /** Optional authentication artifacts (e.g., session data) */
  artifacts?: unknown;
};

export const headersSchema: z.ZodRecord<z.ZodString, z.ZodString> = z.record(
  z.string(),
  z.string(),
);

/**
 * HTTP headers as a record of string key-value pairs.
 */
export type Headers = z.infer<typeof headersSchema>;

export const handlerSuccess: z.ZodObject<{
  encoding: z.ZodString;
  body: z.ZodAny;
  headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}> = z.object({
  encoding: z.string(),
  body: z.any(),
  headers: headersSchema.optional(),
});

/**
 * Successful response from a method handler.
 */
export type HandlerSuccess = z.infer<typeof handlerSuccess>;

/**
 * Handler response that pipes through a buffer.
 */
export type HandlerPipeThroughBuffer = {
  /** Content encoding of the response */
  encoding: string;
  /** Response data as a buffer */
  buffer: Uint8Array;
  /** Optional HTTP headers */
  headers?: Headers;
};

/**
 * Handler response that pipes through a stream.
 */
export type HandlerPipeThroughStream = {
  /** Content encoding of the response */
  encoding: string;
  /** Response data as a readable stream */
  stream: ReadableStream<Uint8Array>;
  /** Optional HTTP headers */
  headers?: Headers;
};

/**
 * Union type for handler responses that pipe data through either a buffer or stream.
 */
export type HandlerPipeThrough =
  | HandlerPipeThroughBuffer
  | HandlerPipeThroughStream;

/**
 * Authentication state for a handler context.
 */
export type Auth = void | AuthResult;

/**
 * Input data for a handler context.
 */
export type Input = void | HandlerInput;

/**
 * Output data from a handler.
 */
export type Output = void | HandlerSuccess | ErrorResult;

/**
 * Function that verifies authentication for a request.
 * @template C - The context type
 * @template A - The authentication result type
 */
export type AuthVerifier<C, A extends AuthResult = AuthResult> =
  | ((ctx: C) => Awaitable<A | ErrorResult>)
  | ((ctx: C) => Awaitable<A>);

// Handler context that combines Hono Context with XRPC-specific properties
/**
 * Context object provided to XRPC method handlers containing request data and utilities.
 * @template A - Authentication type
 * @template P - Parameters type
 * @template I - Input type
 */
export type HandlerContext<
  A extends Auth = Auth,
  P extends Params = Params,
  I extends Input = Input,
> = MethodAuthContext<P> & {
  /** Authentication result */
  auth: A;
  /** Request input data */
  input: I;
  /** Function to reset rate limits for this route */
  resetRouteRateLimits: () => Promise<void>;
};

/**
 * Handler function for XRPC methods.
 * @template A - Authentication type
 * @template P - Parameters type
 * @template I - Input type
 * @template O - Output type
 */
export type MethodHandler<
  A extends Auth = Auth,
  P extends Params = Params,
  I extends Input = Input,
  O extends Output = Output,
> = (ctx: HandlerContext<A, P, I>) => Awaitable<O | HandlerPipeThrough>;

/**
 * Factory function for creating rate limiter instances.
 * @template T - The handler context type
 */
export type RateLimiterCreator<T extends HandlerContext = HandlerContext> = <
  C extends T = T,
>(opts: {
  /** Prefix for rate limiter keys */
  keyPrefix: string;
  /** Duration window in milliseconds */
  durationMs: number;
  /** Number of points allowed in the duration window */
  points: number;
  /** Function to calculate the rate limit key */
  calcKey: CalcKeyFn<C>;
  /** Function to calculate points consumed */
  calcPoints: CalcPointsFn<C>;
  /** Whether to fail closed (deny) when rate limiter is unavailable */
  failClosed?: boolean;
}) => RateLimiterI<C>;

/**
 * Context object for method authentication containing request data.
 * @template P - Parameters type
 * @template I - Input type
 */
export type MethodAuthContext<
  P extends Params = Params,
  I extends Input = Input,
> = {
  /** Parsed request parameters */
  params: P;
  /** Request input data */
  input: I;
  /** HTTP request object */
  req: Request;
  /** HTTP response object */
  res: Response;
};

/**
 * Authentication verifier function for XRPC methods.
 * @template A - Authentication result type
 * @template P - Parameters type
 * @template I - Input type
 */
export type MethodAuthVerifier<
  A extends AuthResult = AuthResult,
  P extends Params = Params,
  I extends Input = Input,
> = (ctx: MethodAuthContext<P, I>) => Awaitable<A>;

/**
 * Context object for streaming handlers.
 * @template A - Authentication type
 * @template P - Parameters type
 */
export type StreamContext<
  A extends Auth = Auth,
  P extends Params = Params,
> = StreamAuthContext<P> & {
  /** Authentication result */
  auth: A;
  /** Abort signal for cancelling the stream */
  signal: AbortSignal;
};

/**
 * Handler function for streaming XRPC endpoints.
 * @template A - Authentication type
 * @template P - Parameters type
 * @template O - Output item type
 */
export type StreamHandler<
  A extends Auth = Auth,
  P extends Params = Params,
  O = unknown,
> = (ctx: StreamContext<A, P>) => AsyncIterable<O>;

/**
 * Context object for stream authentication.
 * @template P - Parameters type
 */
export type StreamAuthContext<P extends Params = Params> = {
  /** Parsed request parameters */
  params: P;
  /** HTTP request object */
  req: Request;
};

/**
 * Authentication verifier function for streaming endpoints.
 * @template A - Authentication result type
 * @template P - Parameters type
 */
export type StreamAuthVerifier<
  A extends AuthResult = AuthResult,
  P extends Params = Params,
> = AuthVerifier<StreamAuthContext<P>, A>;

/**
 * Configuration for server-level rate limits.
 * @template C - Handler context type
 */
export type ServerRateLimitDescription<
  C extends HandlerContext = HandlerContext,
> = {
  /** Unique name for this rate limit */
  name: string;
  /** Duration window in milliseconds */
  durationMs: number;
  /** Number of points allowed in the duration window */
  points: number;
  /** Optional function to calculate the rate limit key */
  calcKey?: CalcKeyFn<C>;
  /** Optional function to calculate points consumed */
  calcPoints?: CalcPointsFn<C>;
  /** Whether to fail closed when rate limiter is unavailable */
  failClosed?: boolean;
};

/**
 * Options for referencing a shared rate limit by name.
 * @template C - Handler context type
 */
export type SharedRateLimitOpts<C extends HandlerContext = HandlerContext> = {
  /** Name of the shared rate limit to use */
  name: string;
  /** Optional function to calculate the rate limit key */
  calcKey?: CalcKeyFn<C>;
  /** Optional function to calculate points consumed */
  calcPoints?: CalcPointsFn<C>;
};

/**
 * Options for defining a route-specific rate limit.
 * @template C - Handler context type
 */
export type RouteRateLimitOpts<C extends HandlerContext = HandlerContext> = {
  /** Duration window in milliseconds */
  durationMs: number;
  /** Number of points allowed in the duration window */
  points: number;
  /** Optional function to calculate the rate limit key */
  calcKey?: CalcKeyFn<C>;
  /** Optional function to calculate points consumed */
  calcPoints?: CalcPointsFn<C>;
};

/**
 * Union type for rate limit options - either shared or route-specific.
 * @template C - Handler context type
 */
export type RateLimitOpts<C extends HandlerContext = HandlerContext> =
  | SharedRateLimitOpts<C>
  | RouteRateLimitOpts<C>;

/**
 * Type guard to check if rate limit options are for a shared rate limit.
 * @template C - Handler context type
 * @param opts Rate limit options to check
 * @returns True if the options reference a shared rate limit
 */
export function isSharedRateLimitOpts<
  C extends HandlerContext = HandlerContext,
>(opts: RateLimitOpts<C>): opts is SharedRateLimitOpts<C> {
  return "name" in opts && typeof opts.name === "string";
}

/**
 * Options for configuring payload size limits by content type.
 */
export type RouteOptions = {
  /** Maximum size for binary/blob payloads in bytes */
  blobLimit?: number;
  /** Maximum size for JSON payloads in bytes */
  jsonLimit?: number;
  /** Maximum size for text payloads in bytes */
  textLimit?: number;
};

/**
 * Simplified route options with only blob limit configuration.
 */
export type RouteOpts = {
  /** Maximum size for binary/blob payloads in bytes */
  blobLimit?: number;
};

/**
 * Configuration object for an XRPC method including handler, auth, and options.
 * @template A - Authentication type
 * @template P - Parameters type
 * @template I - Input type
 * @template O - Output type
 */
export type MethodConfig<
  A extends Auth = Auth,
  P extends Params = Params,
  I extends Input = Input,
  O extends Output = Output,
> = {
  /** The method handler function */
  handler: MethodHandler<A, P, I, O>;
  /** Optional authentication verifier */
  auth?: MethodAuthVerifier<Extract<A, AuthResult>, P>;
  /** Optional route configuration */
  opts?: RouteOptions;
  /** Optional rate limiting configuration */
  rateLimit?:
    | RateLimitOpts<HandlerContext<A, P, I>>
    | RateLimitOpts<HandlerContext<A, P, I>>[];
};

/**
 * Union type allowing either a simple handler function or full method configuration.
 * @template A - Authentication type
 * @template P - Parameters type
 * @template I - Input type
 * @template O - Output type
 */
export type MethodConfigOrHandler<
  A extends Auth = Auth,
  P extends Params = Params,
  I extends Input = Input,
  O extends Output = Output,
> = MethodHandler<A, P, I, O> | MethodConfig<A, P, I, O>;

/**
 * Configuration object for a streaming XRPC endpoint.
 * @template A - Authentication type
 * @template P - Parameters type
 * @template O - Output item type
 */
export type StreamConfig<
  A extends Auth = Auth,
  P extends Params = Params,
  O = unknown,
> = {
  /** Optional authentication verifier for the stream */
  auth?: StreamAuthVerifier<Extract<A, AuthResult>, P>;
  /** The stream handler function */
  handler: StreamHandler<A, P, O>;
};

/**
 * Union type allowing either a simple stream handler or full stream configuration.
 * @template A - Authentication type
 * @template P - Parameters type
 * @template O - Output item type
 */
export type StreamConfigOrHandler<
  A extends Auth = Auth,
  P extends Params = Params,
  O = unknown,
> = StreamHandler<A, P, O> | StreamConfig<A, P, O>;

/**
 * Type guard to check if handler output is a pipe-through buffer response.
 * @param output - The handler output to check
 * @returns True if the output is a buffer pipe-through response
 */
export function isHandlerPipeThroughBuffer(
  output: Output | HandlerPipeThrough,
): output is HandlerPipeThroughBuffer {
  // We only need to discriminate between possible Output values
  return output != null && "buffer" in output && output["buffer"] !== undefined;
}

/**
 * Type guard to check if handler output is a pipe-through stream response.
 * @param output - The handler output to check
 * @returns True if the output is a stream pipe-through response
 */
export function isHandlerPipeThroughStream(
  output: Output | HandlerPipeThrough,
): output is HandlerPipeThroughStream {
  // We only need to discriminate between possible Output values
  return output != null && "stream" in output && output["stream"] !== undefined;
}
