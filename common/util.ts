export const noUndefinedVals = <T>(
  obj: Record<string, T | undefined>,
): Record<string, T> => {
  Object.keys(obj).forEach((k) => {
    if (obj[k] === undefined) {
      delete obj[k];
    }
  });
  return obj as Record<string, T>;
};

/**
 * Returns a shallow copy of the object without the specified keys. If the input
 * is nullish, it returns the input.
 */
export function omit<
  T extends undefined | null | Record<string, unknown>,
  K extends keyof NonNullable<T>,
>(
  object: T,
  rejectedKeys: readonly K[],
): T extends undefined ? undefined : T extends null ? null : Omit<T, K>;
export function omit(
  src: undefined | null | Record<string, unknown>,
  rejectedKeys: readonly string[],
): undefined | null | Record<string, unknown> {
  // Hot path

  if (!src) return src;

  const dst: Record<string, unknown> = {};
  const srcKeys = Object.keys(src);
  for (let i = 0; i < srcKeys.length; i++) {
    const key = srcKeys[i];
    if (!rejectedKeys.includes(key)) {
      dst[key] = src[key];
    }
  }
  return dst;
}

export const jitter = (maxMs: number) => {
  return Math.round((Math.random() - 0.5) * maxMs * 2);
};

export const wait = (ms: number) => {
  return new Promise((res) => setTimeout(res, ms));
};

export type BailableWait = {
  bail: () => void;
  wait: () => Promise<void>;
};

export const bailableWait = (ms: number): BailableWait => {
  let bail!: () => void;
  const waitPromise = new Promise<void>((res) => {
    const timeout = setTimeout(res, ms);
    bail = () => {
      clearTimeout(timeout);
      res();
    };
  });
  return { bail, wait: () => waitPromise };
};

export const flattenUint8Arrays = (arrs: Uint8Array[]): Uint8Array => {
  const length = arrs.reduce((acc, cur) => {
    return acc + cur.length;
  }, 0);
  const flattened = new Uint8Array(length);
  let offset = 0;
  arrs.forEach((arr) => {
    flattened.set(arr, offset);
    offset += arr.length;
  });
  return flattened;
};

export const streamToBuffer = async (
  stream: AsyncIterable<Uint8Array>,
): Promise<Uint8Array> => {
  const arrays: Uint8Array[] = [];
  for await (const chunk of stream) {
    arrays.push(chunk);
  }
  return flattenUint8Arrays(arrays);
};

const S32_CHAR = "234567abcdefghijklmnopqrstuvwxyz";

export const s32encode = (i: number): string => {
  let s = "";
  while (i) {
    const c = i % 32;
    i = Math.floor(i / 32);
    s = S32_CHAR.charAt(c) + s;
  }
  return s;
};

export const s32decode = (s: string): number => {
  let i = 0;
  for (const c of s) {
    i = i * 32 + S32_CHAR.indexOf(c);
  }
  return i;
};

export const asyncFilter = async <T>(
  arr: T[],
  fn: (t: T) => Promise<boolean>,
) => {
  const results = await Promise.all(arr.map((t) => fn(t)));
  return arr.filter((_, i) => results[i]);
};

export const errHasMsg = (err: unknown, msg: string): boolean => {
  return !!err && typeof err === "object" && "message" in err &&
    (err as { message: unknown }).message === msg;
};

export const chunkArray = <T>(arr: T[], chunkSize: number): T[][] => {
  return arr.reduce((acc, cur, i) => {
    const chunkI = Math.floor(i / chunkSize);
    if (!acc[chunkI]) {
      acc[chunkI] = [];
    }
    acc[chunkI].push(cur);
    return acc;
  }, [] as T[][]);
};

export const range = (num: number): number[] => {
  const nums: number[] = [];
  for (let i = 0; i < num; i++) {
    nums.push(i);
  }
  return nums;
};

export const dedupeStrs = (strs: string[]): string[] => {
  return [...new Set(strs)];
};

export const parseIntWithFallback = <T>(
  value: string | undefined,
  fallback: T,
): number | T => {
  const parsed = parseInt(value || "", 10);
  return isNaN(parsed) ? fallback : parsed;
};

export function ui8ToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteLength + bytes.byteOffset,
  ) as ArrayBuffer;
}

export type RetryOptions = {
  maxRetries?: number;
  getWaitMs?: (n: number) => number | null;
};

export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions & {
    retryable?: (err: unknown) => boolean;
  } = {},
): Promise<T> {
  const { maxRetries = 3, retryable = () => true, getWaitMs = backoffMs } =
    opts;
  let retries = 0;
  let doneError: unknown;
  while (!doneError) {
    try {
      return await fn();
    } catch (err) {
      const waitMs = getWaitMs(retries);
      const willRetry = retries < maxRetries && waitMs !== null &&
        retryable(err);
      if (willRetry) {
        retries += 1;
        if (waitMs !== 0) {
          await wait(waitMs);
        }
      } else {
        doneError = err;
      }
    }
  }
  throw doneError;
}

export function createRetryable(retryable: (err: unknown) => boolean) {
  return <T>(fn: () => Promise<T>, opts?: RetryOptions) =>
    retry(fn, { ...opts, retryable });
}

// Waits exponential backoff with max and jitter: ~100, ~200, ~400, ~800, ~1000, ~1000, ...
export function backoffMs(n: number, multiplier = 100, max = 1000) {
  const exponentialMs = Math.pow(2, n) * multiplier;
  const ms = Math.min(exponentialMs, max);
  return jitter(ms);
}

export function keyBy<T, K extends keyof T>(
  arr: readonly T[],
  key: K,
): Map<T[K], T> {
  return arr.reduce((acc, cur) => {
    acc.set(cur[key], cur);
    return acc;
  }, new Map<T[K], T>());
}

export const mapDefined = <T, S>(
  arr: T[],
  fn: (obj: T) => S | undefined,
): S[] => {
  const output: S[] = [];
  for (const item of arr) {
    const val = fn(item);
    if (val !== undefined) {
      output.push(val);
    }
  }
  return output;
};
