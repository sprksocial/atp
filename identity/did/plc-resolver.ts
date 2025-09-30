import type { DidCache } from "../types.ts";
import { BaseResolver } from "./base-resolver.ts";
import { timed } from "./util.ts";

export class DidPlcResolver extends BaseResolver {
  constructor(
    public plcUrl: string,
    public timeout: number,
    public override cache?: DidCache,
  ) {
    super(cache);
  }

  resolveNoCheck(did: string): Promise<unknown> {
    return timed(this.timeout, async (signal: AbortSignal) => {
      const url = new URL(`/${encodeURIComponent(did)}`, this.plcUrl);
      const res = await fetch(url, {
        redirect: "error",
        headers: { accept: "application/did+ld+json,application/json" },
        signal,
      });

      // Positively not found, versus due to e.g. network error
      if (res.status === 404) return null;

      if (!res.ok) {
        throw Object.assign(new Error(res.statusText), { status: res.status });
      }

      return res.json();
    });
  }
}
