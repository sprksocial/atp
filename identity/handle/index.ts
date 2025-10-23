import type { HandleResolverOpts } from "../types.ts";

const SUBDOMAIN = "_atproto";
const PREFIX = "did=";

/**
 * Identity resolver for resolving handles to DIDs
 * using DNS
 */
export class HandleResolver {
  public timeout: number;
  private backupNameservers: string[] | undefined;
  private backupNameserverIps: string[] | undefined;

  constructor(opts: HandleResolverOpts = {}) {
    this.timeout = opts.timeout ?? 3000;
    this.backupNameservers = opts.backupNameservers;
  }

  async resolve(handle: string): Promise<string | undefined> {
    const dnsPromise = this.resolveDns(handle);
    const httpAbort = new AbortController();
    const httpPromise = this.resolveHttp(handle, httpAbort.signal).catch(
      () => undefined,
    );

    const dnsRes = await dnsPromise;
    if (dnsRes) {
      httpAbort.abort();
      return dnsRes;
    }
    const res = await httpPromise;
    if (res) {
      return res;
    }
    return this.resolveDnsBackup(handle);
  }

  async resolveDns(handle: string): Promise<string | undefined> {
    let chunkedResults: string[][];
    try {
      chunkedResults = await Deno.resolveDns(`${SUBDOMAIN}.${handle}`, "TXT");
    } catch {
      return undefined;
    }
    return this.parseDnsResult(chunkedResults);
  }

  async resolveHttp(
    handle: string,
    signal?: AbortSignal,
  ): Promise<string | undefined> {
    const url = new URL("/.well-known/atproto-did", `https://${handle}`);
    try {
      const res = await fetch(url, { signal });
      const did = (await res.text()).split("\n")[0].trim();
      if (typeof did === "string" && did.startsWith("did:")) {
        return did;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  async resolveDnsBackup(handle: string): Promise<string | undefined> {
    let chunkedResults: string[][];
    try {
      const backupIps = await this.getBackupNameserverIps();
      if (!backupIps || backupIps.length < 1) return undefined;
      const nameServers = backupIps.map(ip => ({ ipAddr: ip }));
      chunkedResults = await Deno.resolveDns(`${SUBDOMAIN}.${handle}`, "TXT", {
        nameServer: nameServers[0], // Use first backup server
      });
    } catch {
      return undefined;
    }
    return this.parseDnsResult(chunkedResults);
  }

  parseDnsResult(chunkedResults: string[][]): string | undefined {
    const results = chunkedResults.map((chunks) => chunks.join(""));
    const found = results.filter((i) => i.startsWith(PREFIX));
    if (found.length !== 1) {
      return undefined;
    }
    return found[0].slice(PREFIX.length);
  }

  private async getBackupNameserverIps(): Promise<string[] | undefined> {
    if (!this.backupNameservers) {
      return undefined;
    } else if (!this.backupNameserverIps) {
      const responses = await Promise.allSettled(
        this.backupNameservers.map((h) => Deno.resolveDns(h, "A")),
      );
      for (const res of responses) {
        if (res.status === "fulfilled") {
          this.backupNameserverIps ??= [];
          this.backupNameserverIps.push(...res.value);
        }
      }
    }
    return this.backupNameserverIps;
  }
}
