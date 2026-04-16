import { NSID } from "@atp/syntax";

export class LexResolverError extends Error {
  override name = "LexResolverError";

  constructor(
    public readonly nsid: NSID,
    public readonly description = "Could not resolve Lexicon for NSID",
    options?: ErrorOptions,
  ) {
    super(`${description} (${nsid})`, options);
  }

  static from(nsid: NSID | string, description?: string): LexResolverError {
    return new LexResolverError(
      typeof nsid === "string" ? NSID.from(nsid) : nsid,
      description,
    );
  }
}
