import {
  type RateLimiterAbstract,
  RateLimiterMemory,
  RateLimiterRedis,
  RateLimiterRes,
} from "rate-limiter-flexible";
import { ResponseType, XRPCError } from "./errors.ts";
import { logger } from "./logger.ts";

/** Context about the request and response */
export interface RateLimiterContext {
  req: Request;
  res?: Response;
}

/** Method type to calculate the group key of the request */
export type CalcKeyFn<C extends RateLimiterContext = RateLimiterContext> = (
  ctx: C,
) => string | null;

/** Method function to calculate the amount of points at a given time for a duration */
export type CalcPointsFn<C extends RateLimiterContext = RateLimiterContext> = (
  ctx: C,
) => number;

/** Generic rate limiter interface used for all rate limiters */
export interface RateLimiterI<
  C extends RateLimiterContext = RateLimiterContext,
> {
  consume: RateLimiterConsume<C>;
  reset: RateLimiterReset<C>;
}

/** Method options for {@link RateLimiterConsume} */
export type RateLimiterConsumeOptions<
  C extends RateLimiterContext = RateLimiterContext,
> = {
  calcKey?: CalcKeyFn<C>;
  calcPoints?: CalcPointsFn<C>;
};

/** Generic rate limiter request consume method type */
export type RateLimiterConsume<
  C extends RateLimiterContext = RateLimiterContext,
> = (
  ctx: C,
  opts?: RateLimiterConsumeOptions<C>,
) => Promise<RateLimiterStatus | RateLimitExceededError | null>;

/** Information about the current status of the rate limiter
 * @prop limit Current point limit
 * @prop duration Duration limit is applied
 * @prop remainingPoints The remaining points before the limit is reached
 * @prop msBeforeNext Milliseconds before the next duration begins
 * @prop consumedPoints Amount of points consumed in this duration
 * @prop isFirstInDuration Is this the first point in this duration?
 */
export type RateLimiterStatus = {
  limit: number;
  duration: number;
  remainingPoints: number;
  msBeforeNext: number;
  consumedPoints: number;
  isFirstInDuration: boolean;
};

/** Options for {@link RateLimiterReset} */
export type RateLimiterResetOptions<
  C extends RateLimiterContext = RateLimiterContext,
> = {
  calcKey?: CalcKeyFn<C>;
};

/** Generic method type to reset any rate limiter **/
export type RateLimiterReset<
  C extends RateLimiterContext = RateLimiterContext,
> = (ctx: C, opts?: RateLimiterResetOptions<C>) => Promise<void>;

/**
 * Generic options for {@link RateLimiter}
 * @prop keyPrefix A prefix to differentiate multiple rate limiters
 * @prop durationMs Millisecond duration of the period the limit is applied on
 * @prop points Amount of points allowed over the duration
 * @prop calcKey Method to calculate what rate limits apply to the request
 * @prop calcPoints Method to calculate the group key for the request
 * @prop failClosed Should all requests be rejected if the rate limiter fails?
 */
export type RateLimiterOptions<
  C extends RateLimiterContext = RateLimiterContext,
> = {
  keyPrefix: string;
  durationMs: number;
  points: number;
  calcKey: CalcKeyFn<C>;
  calcPoints: CalcPointsFn<C>;
  failClosed?: boolean;
};

export class RateLimiter<C extends RateLimiterContext = RateLimiterContext>
  implements RateLimiterI<C> {
  private readonly failClosed?: boolean;
  private readonly calcKey: CalcKeyFn<C>;
  private readonly calcPoints: CalcPointsFn<C>;

  constructor(
    public limiter: RateLimiterAbstract,
    options: RateLimiterOptions<C>,
  ) {
    this.limiter = limiter;
    this.failClosed = options.failClosed ?? false;
    this.calcKey = options.calcKey;
    this.calcPoints = options.calcPoints;
  }

  async consume(
    ctx: C,
    opts?: RateLimiterConsumeOptions<C>,
  ): Promise<RateLimiterStatus | RateLimitExceededError | null> {
    const calcKey = opts?.calcKey ?? this.calcKey;
    const key = calcKey(ctx);
    if (key === null) {
      return null;
    }
    const calcPoints = opts?.calcPoints ?? this.calcPoints;
    const points = calcPoints(ctx);
    if (points < 1) {
      return null;
    }
    try {
      const res = await this.limiter.consume(key, points);
      return formatLimiterStatus(this.limiter, res);
    } catch (err) {
      // yes this library rejects with a res not an error
      if (err instanceof RateLimiterRes) {
        const status = formatLimiterStatus(this.limiter, err);
        return new RateLimitExceededError(status);
      } else {
        if (this.failClosed) {
          throw err;
        }
        logger.error(
          "rate limiter failed to consume points",
          {
            err,
            keyPrefix: this.limiter.keyPrefix,
            points: this.limiter.points,
            duration: this.limiter.duration,
          },
        );
        return null;
      }
    }
  }

  async reset(ctx: C, opts?: RateLimiterResetOptions<C>): Promise<void> {
    const key = opts?.calcKey ? opts.calcKey(ctx) : this.calcKey(ctx);
    if (key === null) {
      return;
    }

    try {
      await this.limiter.delete(key);
    } catch (cause) {
      throw new Error(`rate limiter failed to reset key: ${key}`, { cause });
    }
  }
}

/**
 * Rate limiter implementation using memory,
 * recommended for low-scale uses.
 *
 * Should not be used with Cloudflare Workers
 * or serverless/edge use cases.
 */
export class MemoryRateLimiter<
  C extends RateLimiterContext = RateLimiterContext,
> extends RateLimiter<C> {
  constructor(options: RateLimiterOptions<C>) {
    const limiter = new RateLimiterMemory({
      keyPrefix: options.keyPrefix,
      duration: Math.floor(options.durationMs / 1000),
      points: options.points,
    });
    super(limiter, options);
  }
}

/**
 * Rate limiter implementation using Redis,
 * recommended for medium or high scale
 * or any serverless/edge use case.
 */
export class RedisRateLimiter<
  C extends RateLimiterContext = RateLimiterContext,
> extends RateLimiter<C> {
  constructor(storeClient: unknown, options: RateLimiterOptions<C>) {
    const limiter = new RateLimiterRedis({
      storeClient,
      keyPrefix: options.keyPrefix,
      duration: Math.floor(options.durationMs / 1000),
      points: options.points,
    });
    super(limiter, options);
  }
}

/**
 * Method type to get rate limiter status
 * from a response and a rate limiter instance
 * @param limiter Rate limiter instance
 * @param res Response returned by rate limiter
 */
export const formatLimiterStatus = (
  limiter: RateLimiterAbstract,
  res: RateLimiterRes,
): RateLimiterStatus => {
  return {
    limit: limiter.points,
    duration: limiter.duration,
    remainingPoints: res.remainingPoints,
    msBeforeNext: res.msBeforeNext,
    consumedPoints: res.consumedPoints,
    isFirstInDuration: res.isFirstInDuration,
  };
};

/** Options for {@link WrappedRateLimiter} */
export type WrappedRateLimiterOptions<
  C extends RateLimiterContext = RateLimiterContext,
> = {
  calcKey?: CalcKeyFn<C>;
  calcPoints?: CalcPointsFn<C>;
};

/**
 * Wraps a {@link RateLimiterI} instance with custom key and points calculation
 * functions.
 */
export class WrappedRateLimiter<
  C extends RateLimiterContext = RateLimiterContext,
> implements RateLimiterI<C> {
  private constructor(
    private readonly rateLimiter: RateLimiterI<C>,
    private readonly options: Readonly<WrappedRateLimiterOptions<C>>,
  ) {}

  consume(
    ctx: C,
    opts?: RateLimiterConsumeOptions<C>,
  ): Promise<RateLimiterStatus | RateLimitExceededError | null> {
    return this.rateLimiter.consume(ctx, {
      calcKey: opts?.calcKey ?? this.options.calcKey,
      calcPoints: opts?.calcPoints ?? this.options.calcPoints,
    });
  }

  reset(ctx: C, opts?: RateLimiterResetOptions<C>): Promise<void> {
    return this.rateLimiter.reset(ctx, {
      calcKey: opts?.calcKey ?? this.options.calcKey,
    });
  }

  static from<C extends RateLimiterContext = RateLimiterContext>(
    rateLimiter: RateLimiterI<C>,
    { calcKey, calcPoints }: WrappedRateLimiterOptions<C> = {},
  ): RateLimiterI<C> {
    if (!calcKey && !calcPoints) return rateLimiter;
    return new WrappedRateLimiter<C>(rateLimiter, { calcKey, calcPoints });
  }
}

/**
 * Combines multiple rate limiters into one.
 *
 * The combined rate limiter will return the tightest (most restrictive) of all
 * the provided rate limiters.
 */
export class CombinedRateLimiter<
  C extends RateLimiterContext = RateLimiterContext,
> implements RateLimiterI<C> {
  private constructor(
    private readonly rateLimiters: readonly RateLimiterI<C>[],
  ) {}

  async consume(
    ctx: C,
    opts?: RateLimiterConsumeOptions<C>,
  ): Promise<RateLimiterStatus | RateLimitExceededError | null> {
    const promises: ReturnType<RateLimiterConsume>[] = [];
    for (const rl of this.rateLimiters) promises.push(rl.consume(ctx, opts));
    return await Promise.all(promises).then(getTightestLimit);
  }

  async reset(ctx: C, opts?: RateLimiterResetOptions<C>) {
    const promises: ReturnType<RateLimiterReset>[] = [];
    for (const rl of this.rateLimiters) promises.push(rl.reset(ctx, opts));
    await Promise.all(promises);
  }

  static from<C extends RateLimiterContext = RateLimiterContext>(
    rateLimiters: readonly RateLimiterI<C>[],
  ): RateLimiterI<C> | undefined {
    if (rateLimiters.length === 0) return undefined;
    if (rateLimiters.length === 1) return rateLimiters[0];
    return new CombinedRateLimiter(rateLimiters);
  }
}

const getTightestLimit = (
  resps: (RateLimiterStatus | RateLimitExceededError | null)[],
): RateLimiterStatus | RateLimitExceededError | null => {
  let lowest: RateLimiterStatus | null = null;
  for (const resp of resps) {
    if (resp === null) continue;
    if (resp instanceof RateLimitExceededError) return resp;
    if (lowest === null || resp.remainingPoints < lowest.remainingPoints) {
      lowest = resp;
    }
  }
  return lowest;
};

/** Options for {@link RouteRateLimiter} */
export type RouteRateLimiterOptions<
  C extends RateLimiterContext = RateLimiterContext,
> = {
  bypass?: (ctx: C) => boolean;
};

/**
 * Wraps a {@link RateLimiterI} interface into a class that will apply the
 * appropriate headers to the response if a limit is exceeded.
 */
export class RouteRateLimiter<C extends RateLimiterContext = RateLimiterContext>
  implements RateLimiterI<C> {
  constructor(
    private readonly rateLimiter: RateLimiterI<C>,
    private readonly options: Readonly<RouteRateLimiterOptions<C>> = {},
  ) {}

  async handle(ctx: C): Promise<RateLimiterStatus | null> {
    const { bypass } = this.options;
    if (bypass && bypass(ctx)) {
      return null;
    }

    const result = await this.consume(ctx);
    if (result instanceof RateLimitExceededError) {
      setStatusHeaders(ctx, result.status);
      throw result;
    } else if (result != null) {
      setStatusHeaders(ctx, result);
    }

    return result;
  }

  consume(
    ...args: Parameters<RateLimiterConsume<C>>
  ): Promise<RateLimiterStatus | RateLimitExceededError | null> {
    return this.rateLimiter.consume(...args);
  }

  reset(...args: Parameters<RateLimiterReset<C>>): Promise<void> {
    return this.rateLimiter.reset(...args);
  }

  static from<C extends RateLimiterContext = RateLimiterContext>(
    rateLimiters: readonly RateLimiterI<C>[],
    { bypass }: RouteRateLimiterOptions<C> = {},
  ): RouteRateLimiter<C> | undefined {
    const rateLimiter = CombinedRateLimiter.from(rateLimiters);
    if (!rateLimiter) return undefined;

    return new RouteRateLimiter(rateLimiter, { bypass });
  }
}

function setStatusHeaders<C extends RateLimiterContext = RateLimiterContext>(
  ctx: C,
  status: RateLimiterStatus,
) {
  const resetAt = Math.floor((Date.now() + status.msBeforeNext) / 1e3);

  ctx.res?.headers.set("RateLimit-Limit", status.limit.toString());
  ctx.res?.headers.set("RateLimit-Reset", resetAt.toString());
  ctx.res?.headers.set(
    "RateLimit-Remaining",
    status.remainingPoints.toString(),
  );
  ctx.res?.headers.set(
    "RateLimit-Policy",
    `${status.limit};w=${status.duration}`,
  );
}

/** XRPC error returned by rate limiter when rate limit has been exceeded */
export class RateLimitExceededError extends XRPCError {
  constructor(
    public status: RateLimiterStatus,
    errorMessage?: string,
    customErrorName?: string,
    options?: ErrorOptions,
  ) {
    super(
      ResponseType.RateLimitExceeded,
      errorMessage,
      customErrorName,
      options,
    );
  }

  [Symbol.hasInstance](instance: unknown): boolean {
    return (
      instance instanceof XRPCError &&
      instance.type === ResponseType.RateLimitExceeded
    );
  }
}
