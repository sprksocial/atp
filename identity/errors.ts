/** Error thrown when a DID cannot be found.
 * Could be due to a non-existent DID or network issues.
 */
export class DidNotFoundError extends Error {
  constructor(public did: string) {
    super(`Could not resolve DID: ${did}`);
  }
}

/**
 * Error thrown when a DID is not formatted correctly.
 * Most commonly, a DID missing `did:` at the beginning
 * or a DID missing a method.
 */
export class PoorlyFormattedDidError extends Error {
  constructor(public did: string) {
    super(`Poorly formatted DID: ${did}`);
  }
}

/**
 * Error thrown for unsupported methods.
 * The methods supported are `did:plc` and `did:web`.
 */
export class UnsupportedDidMethodError extends Error {
  constructor(public did: string) {
    super(`Unsupported DID method: ${did}`);
  }
}

/**
 * Error thrown for DIDs where DID formatting could not be
 * validated or parsed.
 */
export class PoorlyFormattedDidDocumentError extends Error {
  constructor(
    public did: string,
    public doc: unknown,
  ) {
    super(`Poorly formatted DID Document: ${doc}`);
  }
}

/**
 * Error thrown for `did:web` DIDs where the path is not supported.
 * Caused by more than one path segment.
 */
export class UnsupportedDidWebPathError extends Error {
  constructor(public did: string) {
    super(`Unsupported did:web paths: ${did}`);
  }
}
