import { z } from "zod";
import type {
  AtIdentifierString,
  AtUriString,
  CidString,
  DatetimeString,
  DidString,
  HandleString,
  InferMethodInputBody,
  InferMethodParams,
  Procedure,
  Query,
  RecordKeyString,
  TidString,
} from "@atp/lex";

export type QueryParams = Record<string, unknown>;
export type HeadersMap = Record<string, string | undefined>;
export type XrpcMethod = Query | Procedure;
export type XrpcMethodNamespace<M extends XrpcMethod = XrpcMethod> =
  | { readonly main: M }
  | { readonly Main: M };
export type XrpcMethodLike<M extends XrpcMethod = XrpcMethod> =
  | M
  | XrpcMethodNamespace<M>;

type InferXrpcMethod<M extends XrpcMethodLike> = M extends XrpcMethod ? M
  : M extends { readonly main: infer Inner } ? Inner extends XrpcMethod ? Inner
    : never
  : M extends { readonly Main: infer Inner } ? Inner extends XrpcMethod ? Inner
    : never
  : never;

type Digit =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9";
type LowerAlpha =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";
type UpperAlpha = Uppercase<LowerAlpha>;
type Alpha = LowerAlpha | UpperAlpha;
type DidChar = Alpha | Digit | "." | "_" | ":" | "%" | "-";
type DidEndChar = Alpha | Digit | "." | "_" | "-";
type HandleChar = Alpha | Digit | "-";
type RecordKeyChar = Alpha | Digit | "_" | "~" | "." | ":" | "-";
type TidInitialChar =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j";
type TidChar =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | LowerAlpha;
type Base32Char = LowerAlpha | "2" | "3" | "4" | "5" | "6" | "7";
type Base58Char =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z"
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";

type IsLiteralString<S extends string> = string extends S ? false : true;

type IsChars<S extends string, Allowed extends string> =
  IsLiteralString<S> extends false ? false
    : S extends "" ? true
    : S extends `${infer First}${infer Rest}`
      ? First extends Allowed ? IsChars<Rest, Allowed>
      : false
    : false;

type IsDidMethod<S extends string> = IsLiteralString<S> extends false ? false
  : S extends `${infer First}${infer Rest}`
    ? First extends LowerAlpha
      ? Rest extends "" ? true : IsChars<Rest, LowerAlpha>
    : false
  : false;

type IsDidIdentifier<S extends string> = IsLiteralString<S> extends false
  ? false
  : S extends `${infer First}${infer Rest}`
    ? Rest extends "" ? First extends DidEndChar ? true : false
    : First extends DidChar ? IsDidIdentifier<Rest>
    : false
  : false;

type IsDidLiteral<S extends string> = S extends
  `did:${infer Method}:${infer Id}`
  ? IsDidMethod<Method> extends true ? IsDidIdentifier<Id>
  : false
  : false;

type IsHandleLabel<S extends string> = IsLiteralString<S> extends false ? false
  : S extends `${infer First}${infer Rest}`
    ? First extends Alpha | Digit
      ? Rest extends "" ? true : IsHandleLabelTail<Rest>
    : false
  : false;

type IsHandleLabelTail<S extends string> = S extends
  `${infer First}${infer Rest}`
  ? Rest extends "" ? First extends Alpha | Digit ? true : false
  : First extends HandleChar ? IsHandleLabelTail<Rest>
  : false
  : false;

type IsFinalHandleLabel<S extends string> = IsLiteralString<S> extends false
  ? false
  : S extends `${infer First}${infer Rest}`
    ? First extends Alpha ? Rest extends "" ? true : IsHandleLabelTail<Rest>
    : false
  : false;

type IsHandleParts<S extends string> = S extends `${infer Label}.${infer Rest}`
  ? IsHandleLabel<Label> extends true ? IsHandleParts<Rest> : false
  : IsFinalHandleLabel<S>;

type IsHandleLiteral<S extends string> = S extends `${string}.${string}`
  ? IsHandleParts<S>
  : false;

type IsAtIdentifierLiteral<S extends string> = IsDidLiteral<S> extends true
  ? true
  : IsHandleLiteral<S>;

type IsRecordKeyLiteral<S extends string> = IsLiteralString<S> extends false
  ? false
  : S extends "." | ".." ? false
  : S extends `${infer _First}${infer _Rest}` ? IsChars<S, RecordKeyChar>
  : false;

type IsExactChars<
  S extends string,
  Allowed extends string,
  Length extends number,
  Count extends unknown[] = [],
> = Count["length"] extends Length ? (S extends "" ? true : false)
  : S extends `${infer First}${infer Rest}`
    ? First extends Allowed
      ? IsExactChars<Rest, Allowed, Length, [...Count, unknown]>
    : false
  : false;

type IsTidLiteral<S extends string> = S extends `${infer First}${infer Rest}`
  ? First extends TidInitialChar ? IsExactChars<Rest, TidChar, 12> : false
  : false;

type IsDatetimeDate<S extends string> = S extends
  `${infer Year}-${infer Month}-${infer Day}`
  ? IsExactChars<Year, Digit, 4> extends true
    ? IsExactChars<Month, Digit, 2> extends true ? IsExactChars<Day, Digit, 2>
    : false
  : false
  : false;

type IsDatetimeTime<S extends string> = S extends
  `${infer Hour}:${infer Minute}:${infer Second}`
  ? IsExactChars<Hour, Digit, 2> extends true
    ? IsExactChars<Minute, Digit, 2> extends true
      ? IsExactChars<Second, Digit, 2>
    : false
  : false
  : false;

type IsDatetimeOffset<S extends string> = S extends
  `${infer Hour}:${infer Minute}`
  ? IsExactChars<Hour, Digit, 2> extends true ? IsExactChars<Minute, Digit, 2>
  : false
  : false;

type IsDatetimeTail<S extends string> = S extends
  `${infer Time}.${infer Fraction}Z`
  ? IsDatetimeTime<Time> extends true ? IsChars<Fraction, Digit> : false
  : S extends `${infer Time}Z` ? IsDatetimeTime<Time>
  : S extends `${infer Time}+${infer Offset}`
    ? IsDatetimeTime<Time> extends true ? IsDatetimeOffset<Offset> : false
  : S extends `${infer Time}-${infer Offset}`
    ? IsDatetimeTime<Time> extends true ? IsDatetimeOffset<Offset> : false
  : S extends `${infer Time}.${infer Fraction}+${infer Offset}`
    ? IsDatetimeTime<Time> extends true
      ? IsChars<Fraction, Digit> extends true ? IsDatetimeOffset<Offset> : false
    : false
  : S extends `${infer Time}.${infer Fraction}-${infer Offset}`
    ? IsDatetimeTime<Time> extends true
      ? IsChars<Fraction, Digit> extends true ? IsDatetimeOffset<Offset> : false
    : false
  : false;

type IsDatetimeLiteral<S extends string> = S extends
  `${infer Date}T${infer Tail}`
  ? IsDatetimeDate<Date> extends true ? IsDatetimeTail<Tail> : false
  : false;

type AtUriHost<S extends string> = S extends `at://${infer Host}/${string}`
  ? Host
  : S extends `at://${infer Host}?${string}` ? Host
  : S extends `at://${infer Host}#${string}` ? Host
  : S extends `at://${infer Host}` ? Host
  : never;

type IsAtUriLiteral<S extends string> = [AtUriHost<S>] extends [never] ? false
  : AtUriHost<S> extends infer Host extends string
    ? Host extends "" ? false : IsAtIdentifierLiteral<Host>
  : false;

type IsCidLiteral<S extends string> = S extends `b${infer Rest}`
  ? IsChars<Rest, Base32Char>
  : S extends `z${infer Rest}` ? IsChars<Rest, Base58Char>
  : S extends `Qm${infer Rest}` ? IsChars<Rest, Base58Char>
  : false;

type ValidateStringLiteral<Actual, Expected> = Actual extends string
  ? IsLiteralString<Actual> extends false ? never
  : [Expected] extends [DidString] ? IsDidLiteral<Actual> extends true ? Actual
    : never
  : [Expected] extends [HandleString]
    ? IsHandleLiteral<Actual> extends true ? Actual : never
  : [Expected] extends [AtIdentifierString]
    ? IsAtIdentifierLiteral<Actual> extends true ? Actual : never
  : [Expected] extends [RecordKeyString]
    ? IsRecordKeyLiteral<Actual> extends true ? Actual : never
  : [Expected] extends [TidString] ? IsTidLiteral<Actual> extends true ? Actual
    : never
  : [Expected] extends [DatetimeString]
    ? IsDatetimeLiteral<Actual> extends true ? Actual : never
  : [Expected] extends [AtUriString]
    ? IsAtUriLiteral<Actual> extends true ? Actual : never
  : [Expected] extends [CidString] ? IsCidLiteral<Actual> extends true ? Actual
    : never
  : never
  : never;

type ValidateCallValue<Actual, Expected> = [Actual] extends [Expected] ? Actual
  : undefined extends Expected
    ? ValidateCallValue<Actual, Exclude<Expected, undefined>>
  : Expected extends string ? ValidateStringLiteral<Actual, Expected>
  : Expected extends readonly (infer Value)[]
    ? Actual extends readonly unknown[]
      ? { [K in keyof Actual]: ValidateCallValue<Actual[K], Value> }
    : never
  : Expected extends object
    ? Actual extends object ? ValidateCallObject<Actual, Expected>
    : never
  : never;

type ValidateCallObject<Actual, Expected> =
  & {
    [K in keyof Expected]: K extends keyof Actual
      ? ValidateCallValue<Actual[K], Expected[K]>
      : Expected[K];
  }
  & {
    [K in Exclude<keyof Actual, keyof Expected>]: never;
  };

export type {
  /**
   * @deprecated not to be confused with the WHATWG Headers constructor.
   * Use {@linkcode HeadersMap} instead.
   */
  HeadersMap as Headers,
};

export type Gettable<T> = T | (() => T);

export interface CallOptions {
  encoding?: string;
  signal?: AbortSignal;
  headers?: HeadersMap;
}

export type BinaryBodyInit =
  | Uint8Array
  | ArrayBuffer
  | ArrayBufferView
  | Blob
  | ReadableStream<Uint8Array>
  | AsyncIterable<Uint8Array>
  | string;

export interface XrpcCallOptions<
  M extends XrpcMethodLike = XrpcMethod,
> extends CallOptions {
  params?: InferMethodParams<InferXrpcMethod<M>>;
  body?: InferXrpcMethod<M> extends Procedure
    ? InferMethodInputBody<InferXrpcMethod<M>, BinaryBodyInit>
    : undefined;
  validateRequest?: boolean;
  validateResponse?: boolean;
}

export type XrpcCallCompatibleOptions<
  M extends XrpcMethodLike = XrpcMethod,
  O = XrpcCallOptions<M>,
> = ValidateCallValue<O, XrpcCallOptions<M>>;

export const errorResponseBody: z.ZodObject<{
  error: z.ZodOptional<z.ZodString>;
  message: z.ZodOptional<z.ZodString>;
}> = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
});
export type ErrorResponseBody = z.infer<typeof errorResponseBody>;

export enum ResponseType {
  /**
   * Network issue, unable to get response from the server.
   */
  Unknown = 1,
  /**
   * Response failed lexicon validation.
   */
  InvalidResponse = 2,
  Success = 200,
  InvalidRequest = 400,
  AuthenticationRequired = 401,
  Forbidden = 403,
  XRPCNotSupported = 404,
  NotAcceptable = 406,
  PayloadTooLarge = 413,
  UnsupportedMediaType = 415,
  RateLimitExceeded = 429,
  InternalServerError = 500,
  MethodNotImplemented = 501,
  UpstreamFailure = 502,
  NotEnoughResources = 503,
  UpstreamTimeout = 504,
}

export function httpResponseCodeToEnum(status: number): ResponseType {
  if (status in ResponseType) {
    return status;
  } else if (status >= 100 && status < 200) {
    return ResponseType.XRPCNotSupported;
  } else if (status >= 200 && status < 300) {
    return ResponseType.Success;
  } else if (status >= 300 && status < 400) {
    return ResponseType.XRPCNotSupported;
  } else if (status >= 400 && status < 500) {
    return ResponseType.InvalidRequest;
  } else {
    return ResponseType.InternalServerError;
  }
}

export function httpResponseCodeToName(status: number): string {
  return ResponseType[httpResponseCodeToEnum(status)];
}

/**
 * Error messages corresponding to XRPC error codes.
 */
export const ResponseTypeStrings: Record<ResponseType, string> = {
  [ResponseType.Unknown]: "Unknown",
  [ResponseType.InvalidResponse]: "Invalid Response",
  [ResponseType.Success]: "Success",
  [ResponseType.InvalidRequest]: "Invalid Request",
  [ResponseType.AuthenticationRequired]: "Authentication Required",
  [ResponseType.Forbidden]: "Forbidden",
  [ResponseType.XRPCNotSupported]: "XRPC Not Supported",
  [ResponseType.NotAcceptable]: "Not Acceptable",
  [ResponseType.PayloadTooLarge]: "Payload Too Large",
  [ResponseType.UnsupportedMediaType]: "Unsupported Media Type",
  [ResponseType.RateLimitExceeded]: "Rate Limit Exceeded",
  [ResponseType.InternalServerError]: "Internal Server Error",
  [ResponseType.MethodNotImplemented]: "Method Not Implemented",
  [ResponseType.UpstreamFailure]: "Upstream Failure",
  [ResponseType.NotEnoughResources]: "Not Enough Resources",
  [ResponseType.UpstreamTimeout]: "Upstream Timeout",
} as const satisfies Record<ResponseType, string>;

export function httpResponseCodeToString(status: number): string {
  return ResponseTypeStrings[httpResponseCodeToEnum(status)];
}

/**
 * Response type of a successful XRPC request.
 */
export class XRPCResponse {
  success = true;

  constructor(
    public data: any,
    public headers: HeadersMap,
  ) {}
}

/**
 * Response type of a failed XRPC request with details of the error.
 */
export class XRPCError extends Error {
  success = false;

  public status: ResponseType;

  constructor(
    statusCode: number,
    public error: string = httpResponseCodeToName(statusCode),
    message?: string,
    public headers?: HeadersMap,
    options?: ErrorOptions,
  ) {
    super(message || error || httpResponseCodeToString(statusCode), options);

    this.status = httpResponseCodeToEnum(statusCode);

    // Pre 2022 runtimes won't handle the "options" constructor argument
    const cause = options?.cause;
    if (this.cause === undefined && cause !== undefined) {
      this.cause = cause;
    }
  }

  static from(cause: unknown, fallbackStatus?: ResponseType): XRPCError {
    if (cause instanceof XRPCError) {
      return cause;
    }

    // Type cast the cause to an Error if it is one
    const causeErr = cause instanceof Error ? cause : undefined;

    // Try and find a Response object in the cause
    const causeResponse: Response | undefined = cause instanceof Response
      ? cause
      : (cause && typeof cause === "object" && "response" in cause &&
          cause.response instanceof Response)
      ? cause.response
      : undefined;

    const statusCode: unknown =
      // Extract status code from "http-errors" like errors
      (causeErr && typeof causeErr === "object" && "statusCode" in causeErr)
        ? causeErr.statusCode
        : (causeErr && typeof causeErr === "object" && "status" in causeErr)
        ? causeErr.status
        // Use the status code from the response object as fallback
        : causeResponse?.status;

    // Convert the status code to a ResponseType
    const status: ResponseType = typeof statusCode === "number"
      ? httpResponseCodeToEnum(statusCode)
      : fallbackStatus ?? ResponseType.Unknown;

    const message = causeErr?.message ?? String(cause);

    const headers = causeResponse
      ? Object.fromEntries(causeResponse.headers.entries())
      : undefined;

    return new XRPCError(status, undefined, message, headers, { cause });
  }
}

/**
 * Error for an invalid response from an XRPC request.
 * Caused by a validation error with the lexicon schema
 * matching the NSID of the endpoint.
 */
export class XRPCInvalidResponseError extends XRPCError {
  constructor(
    public lexiconNsid: string,
    public validationError: Error,
    public responseBody: unknown,
  ) {
    super(
      ResponseType.InvalidResponse,
      // @NOTE: This is probably wrong and should use ResponseTypeNames instead.
      // But it would mean a breaking change.
      ResponseTypeStrings[ResponseType.InvalidResponse],
      `The server gave an invalid response and may be out of date.`,
      undefined,
      { cause: validationError },
    );
  }
}
