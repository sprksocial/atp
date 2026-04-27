import { IdentityResolutionTimeoutError } from "../errors.ts";

/** A timed function to abort after a certain amount of time */
export async function timed<F extends (signal: AbortSignal) => unknown>(
  ms: number,
  fn: F,
): Promise<Awaited<ReturnType<F>>> {
  const abortController = new AbortController();
  const timer = setTimeout(() => abortController.abort(), ms);
  const signal = abortController.signal;

  try {
    return (await fn(signal)) as Awaited<ReturnType<F>>;
  } catch (err) {
    if (signal.aborted) {
      throw new IdentityResolutionTimeoutError(ms, { cause: err });
    }
    throw err;
  } finally {
    clearTimeout(timer);
    abortController.abort();
  }
}
