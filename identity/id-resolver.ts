import { DidResolver } from "./did/did-resolver.ts";
import { HandleResolver } from "./handle/index.ts";
import type { IdentityResolverOpts } from "./types.ts";

/**
 * Combines Handle and DID resolvers into a single identity resolver class.
 */
export class IdResolver {
  public handle: HandleResolver;
  public did: DidResolver;

  constructor(opts: IdentityResolverOpts = {}) {
    const { timeout = 3000, plcUrl, didCache } = opts;
    this.handle = new HandleResolver({
      timeout,
      backupNameservers: opts.backupNameservers,
    });
    this.did = new DidResolver({ timeout, plcUrl, didCache });
  }
}
