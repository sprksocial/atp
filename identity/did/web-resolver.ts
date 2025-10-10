import {
  PoorlyFormattedDidError,
  UnsupportedDidWebPathError,
} from "../errors.ts";
import type { DidCache } from "../types.ts";
import { BaseResolver } from "./base-resolver.ts";
import { timed } from "./util.ts";

/** Path to the DID document on a `did:web` DID. */
export const DOC_PATH = "/.well-known/did.json";

export class DidWebResolver extends BaseResolver {
  constructor(
    public timeout: number,
    public override cache?: DidCache,
  ) {
    super(cache);
  }

  resolveNoCheck(did: string): Promise<unknown> {
    const parsedId = did.split(":").slice(2).join(":");
    const parts = parsedId.split(":").map(decodeURIComponent);
    let path: string;
    if (parts.length < 1) {
      throw new PoorlyFormattedDidError(did);
    } else if (parts.length === 1) {
      path = parts[0] + DOC_PATH;
    } else {
      // how we *would* resolve a did:web with path, if atproto supported it
      //path = parts.join('/') + '/did.json'
      throw new UnsupportedDidWebPathError(did);
    }

    const url = new URL(`https://${path}`);
    if (url.hostname === "localhost") {
      url.protocol = "http";
    }

    return timed(this.timeout, async (signal) => {
      const res = await fetch(url, {
        signal,
        redirect: "error",
        headers: { accept: "application/did+ld+json,application/json" },
      });

      // Positively not found, versus due to e.g. network error
      if (!res.ok) return null;

      return res.json();
    });
  }
}
