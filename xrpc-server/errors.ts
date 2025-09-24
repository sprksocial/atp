import { z } from "zod";
import {
  httpResponseCodeToName,
  httpResponseCodeToString,
  ResponseType,
  ResponseTypeStrings,
  XRPCError as XRPCClientError,
} from "@atp/xrpc";

// @NOTE Do not depend (directly or indirectly) on "./types" here, as it would
// create a circular dependency.

/**
 * Zod schema for error result objects.
 * Defines the structure of error responses with status code and optional error/message fields.
 */
export const errorResult: z.ZodObject<{
  status: z.ZodNumber;
  error: z.ZodOptional<z.ZodString>;
  message: z.ZodOptional<z.ZodString>;
}> = z.object({
  status: z.number(),
  error: z.string().optional(),
  message: z.string().optional(),
});

/**
 * Type representing an error result object.
 * Contains HTTP status code and optional error identifier and message.
 */
export type ErrorResult = z.infer<typeof errorResult>;

/**
 * Type guard to check if a value is an ErrorResult.
 * @param v - The value to check
 * @returns True if the value matches the ErrorResult schema
 */
export function isErrorResult(v: unknown): v is ErrorResult {
  return errorResult.safeParse(v).success;
}

/**
 * Type guard to check if a value is an HTTP Error-like object.
 */
function isHttpErrorLike(
  value: unknown,
): value is { status: number; message: string; name: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "message" in value &&
    "name" in value &&
    typeof (value as Record<string, unknown>).status === "number" &&
    typeof (value as Record<string, unknown>).message === "string" &&
    typeof (value as Record<string, unknown>).name === "string"
  );
}

/**
 * Excludes ErrorResult from a value type and throws if the value is an ErrorResult.
 * @template V - The value type
 * @param v - The value to check and exclude
 * @returns The value if it's not an ErrorResult
 * @throws {XRPCError} If the value is an ErrorResult
 */
export function excludeErrorResult<V>(v: V): Exclude<V, ErrorResult> {
  if (isErrorResult(v)) throw XRPCError.fromErrorResult(v);
  return v as Exclude<V, ErrorResult>;
}

export { ResponseType };

/**
 * Base class for all XRPC errors.
 * Extends the standard Error class with XRPC-specific properties and methods.
 */
export class XRPCError extends Error {
  constructor(
    public type: ResponseType,
    public errorMessage?: string,
    public customErrorName?: string,
    options?: ErrorOptions,
  ) {
    super(errorMessage, options);
  }

  get statusCode(): number {
    const { type } = this;

    if (type < 400 || type >= 600 || !Number.isFinite(type)) {
      return 500;
    }

    return type;
  }

  /**
   * Gets the error payload for HTTP responses.
   * For internal server errors (500), returns generic message instead of error details.
   * @returns Object containing error name and message for the response
   */
  get payload(): {
    error: string | undefined;
    message: string | undefined;
  } {
    return {
      error: this.customErrorName ?? this.typeName,
      message: this.type === ResponseType.InternalServerError
        ? this.typeStr // Do not respond with error details for 500s
        : this.errorMessage || this.typeStr,
    };
  }

  get typeName(): string | undefined {
    return ResponseType[this.type];
  }

  get typeStr(): string | undefined {
    return ResponseTypeStrings[this.type];
  }

  static fromError(cause: unknown): XRPCError {
    if (cause instanceof XRPCError) {
      return cause;
    }

    if (cause instanceof XRPCClientError) {
      const { error, message, type } = mapFromClientError(cause);
      return new XRPCError(type, message, error, { cause });
    }

    if (isHttpErrorLike(cause)) {
      return new XRPCError(cause.status, cause.message, cause.name, { cause });
    }

    if (isErrorResult(cause)) {
      return this.fromErrorResult(cause);
    }

    if (cause instanceof Error) {
      return new InternalServerError(cause.message, undefined, { cause });
    }

    return new InternalServerError(
      "Unexpected internal server error",
      undefined,
      { cause },
    );
  }

  static fromErrorResult(err: ErrorResult): XRPCError {
    return new XRPCError(err.status, err.message, err.error, { cause: err });
  }
}

/**
 * Error class for invalid request errors (HTTP 400).
 * Used when the client request is malformed or invalid.
 */
export class InvalidRequestError extends XRPCError {
  constructor(
    errorMessage?: string,
    customErrorName?: string,
    options?: ErrorOptions,
  ) {
    super(ResponseType.InvalidRequest, errorMessage, customErrorName, options);
  }

  [Symbol.hasInstance](instance: unknown): boolean {
    return (
      instance instanceof XRPCError &&
      instance.type === ResponseType.InvalidRequest
    );
  }
}

/**
 * Error class for authentication required errors (HTTP 401).
 * Used when the request requires authentication but none was provided or it was invalid.
 */
export class AuthRequiredError extends XRPCError {
  constructor(
    errorMessage?: string,
    customErrorName?: string,
    options?: ErrorOptions,
  ) {
    super(
      ResponseType.AuthenticationRequired,
      errorMessage,
      customErrorName,
      options,
    );
  }

  [Symbol.hasInstance](instance: unknown): boolean {
    return (
      instance instanceof XRPCError &&
      instance.type === ResponseType.AuthenticationRequired
    );
  }
}

/**
 * Error class for forbidden errors (HTTP 403).
 * Used when the client is authenticated but doesn't have permission to access the resource.
 */
export class ForbiddenError extends XRPCError {
  constructor(
    errorMessage?: string,
    customErrorName?: string,
    options?: ErrorOptions,
  ) {
    super(ResponseType.Forbidden, errorMessage, customErrorName, options);
  }

  [Symbol.hasInstance](instance: unknown): boolean {
    return (
      instance instanceof XRPCError && instance.type === ResponseType.Forbidden
    );
  }
}

/**
 * Error class for internal server errors (HTTP 500).
 * Used when an unexpected error occurs on the server side.
 */
export class InternalServerError extends XRPCError {
  constructor(
    errorMessage?: string,
    customErrorName?: string,
    options?: ErrorOptions,
  ) {
    super(
      ResponseType.InternalServerError,
      errorMessage,
      customErrorName,
      options,
    );
  }

  [Symbol.hasInstance](instance: unknown): boolean {
    return (
      instance instanceof XRPCError &&
      instance.type === ResponseType.InternalServerError
    );
  }
}

/**
 * Error class for upstream failure errors (HTTP 502).
 * Used when a dependent service fails or returns an invalid response.
 */
export class UpstreamFailureError extends XRPCError {
  constructor(
    errorMessage?: string,
    customErrorName?: string,
    options?: ErrorOptions,
  ) {
    super(ResponseType.UpstreamFailure, errorMessage, customErrorName, options);
  }

  [Symbol.hasInstance](instance: unknown): boolean {
    return (
      instance instanceof XRPCError &&
      instance.type === ResponseType.UpstreamFailure
    );
  }
}

/**
 * Error class for not enough resources errors (HTTP 507).
 * Used when the server temporarily cannot handle the request due to resource constraints.
 */
export class NotEnoughResourcesError extends XRPCError {
  constructor(
    errorMessage?: string,
    customErrorName?: string,
    options?: ErrorOptions,
  ) {
    super(
      ResponseType.NotEnoughResources,
      errorMessage,
      customErrorName,
      options,
    );
  }

  [Symbol.hasInstance](instance: unknown): boolean {
    return (
      instance instanceof XRPCError &&
      instance.type === ResponseType.NotEnoughResources
    );
  }
}

/**
 * Error class for upstream timeout errors (HTTP 504).
 * Used when a dependent service times out or takes too long to respond.
 */
export class UpstreamTimeoutError extends XRPCError {
  constructor(
    errorMessage?: string,
    customErrorName?: string,
    options?: ErrorOptions,
  ) {
    super(ResponseType.UpstreamTimeout, errorMessage, customErrorName, options);
  }

  [Symbol.hasInstance](instance: unknown): boolean {
    return (
      instance instanceof XRPCError &&
      instance.type === ResponseType.UpstreamTimeout
    );
  }
}

/**
 * Error class for method not implemented errors (HTTP 501).
 * Used when the requested XRPC method is not implemented by the server.
 */
export class MethodNotImplementedError extends XRPCError {
  constructor(
    errorMessage?: string,
    customErrorName?: string,
    options?: ErrorOptions,
  ) {
    super(
      ResponseType.MethodNotImplemented,
      errorMessage,
      customErrorName,
      options,
    );
  }

  [Symbol.hasInstance](instance: unknown): boolean {
    return (
      instance instanceof XRPCError &&
      instance.type === ResponseType.MethodNotImplemented
    );
  }
}

function mapFromClientError(error: XRPCClientError): {
  error: string;
  message: string;
  type: ResponseType;
} {
  switch (error.status) {
    case ResponseType.InvalidResponse:
      // Upstream server returned an XRPC response that is not compatible with our internal lexicon definitions for that XRPC method.
      // @NOTE This could be reflected as both a 500 ("we" are at fault) and 502 ("they" are at fault). Let's be gents about it.
      return {
        error: httpResponseCodeToName(ResponseType.InternalServerError),
        message: httpResponseCodeToString(ResponseType.InternalServerError),
        type: ResponseType.InternalServerError,
      };
    case ResponseType.Unknown:
      // Typically a network error / unknown host
      return {
        error: httpResponseCodeToName(ResponseType.InternalServerError),
        message: httpResponseCodeToString(ResponseType.InternalServerError),
        type: ResponseType.InternalServerError,
      };
    default:
      return {
        error: error.error,
        message: error.message,
        type: error.status,
      };
  }
}
