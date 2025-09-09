import type {
  Lexicons,
  LexXrpcProcedure,
  LexXrpcQuery,
  LexXrpcSubscription,
} from "@atproto/lexicon";
import { jsonToLex } from "@atproto/lexicon";
import { InternalServerError, InvalidRequestError } from "./errors.ts";
import { handlerSuccess } from "./types.ts";
import type { HandlerInput, HandlerSuccess, Params } from "./types.ts";
import type { Context, HonoRequest } from "hono";

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

/**
 * Decodes query parameters from HTTP request into typed parameters.
 * Handles type conversion for strings, numbers, booleans, and arrays based on lexicon definitions.
 * @param def - The lexicon definition containing parameter schema
 * @param params - Raw query parameters from the HTTP request
 * @returns Decoded and type-converted parameters
 */
export function decodeQueryParams(
  def: LexXrpcProcedure | LexXrpcQuery | LexXrpcSubscription,
  params: Record<string, string | string[]>,
): Params {
  const decoded: Params = {};
  if (!def.parameters?.properties) {
    return decoded;
  }

  for (const k in def.parameters.properties) {
    const property = def.parameters.properties[k];
    const val = params[k];
    if (property && val !== undefined) {
      if (property.type === "array") {
        const vals = (Array.isArray(val) ? val : [val]).filter(
          (v) => v !== undefined,
        );
        decoded[k] = vals
          .map((v) => decodeQueryParam(property.items?.type || "string", v))
          .filter((v) => v !== undefined) as (string | number | boolean)[];
      } else {
        const actualVal = Array.isArray(val) ? val[0] : val;
        decoded[k] = decodeQueryParam(property.type, actualVal);
      }
    }
  }
  return decoded;
}

/**
 * Decodes a single query parameter value based on its expected type.
 * Converts string values to appropriate JavaScript types (string, number, boolean).
 * @param type - The expected parameter type from the lexicon
 * @param value - The raw parameter value from the query string
 * @returns The decoded parameter value or undefined if conversion fails
 */
export function decodeQueryParam(
  type: string,
  value: unknown,
): string | number | boolean | undefined {
  if (!value) {
    return undefined;
  }
  if (type === "string" || type === "datetime") {
    return String(value);
  }
  if (type === "float") {
    return Number(String(value));
  } else if (type === "integer") {
    return parseInt(String(value), 10) || 0;
  } else if (type === "boolean") {
    return value === "true";
  }
}

/**
 * Extracts query parameters from a URL and returns them as arrays of strings.
 * @param url - The URL to parse (defaults to empty string)
 * @returns Object mapping parameter names to arrays of values
 */
export function getQueryParams(url = ""): Record<string, string[]> {
  const { searchParams } = new URL(url ?? "", "http://x");
  const result: Record<string, string[]> = {};
  for (const key of searchParams.keys()) {
    result[key] = searchParams.getAll(key);
  }
  return result;
}

/**
 * Represents a request-like object with essential HTTP request properties.
 * Used for handling both standard HTTP requests and custom request implementations.
 */
export type RequestLike = {
  headers: Headers | { [key: string]: string | string[] | undefined };
  body?: ReadableStream | unknown;
  method?: string;
  url?: string;
  signal?: AbortSignal;
};

/**
 * Validates the input of an XRPC method against its lexicon definition.
 * Performs content-type validation, body presence checks, and schema validation.
 * @param nsid - The namespace identifier of the method
 * @param def - The lexicon definition for the method
 * @param body - The request body content
 * @param contentType - The Content-Type header value
 * @param lexicons - The lexicon registry for schema validation
 * @returns Validated handler input or undefined for methods without input
 * @throws {InvalidRequestError} If validation fails
 */
export async function validateInput(
  nsid: string,
  def: LexXrpcProcedure | LexXrpcQuery,
  body: unknown,
  contentType: string | undefined | null,
  lexicons: Lexicons,
): Promise<HandlerInput | undefined> {
  let processedBody: unknown | Uint8Array = body;
  if (body instanceof ReadableStream) {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const tempBody = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      tempBody.set(chunk, offset);
      offset += chunk.length;
    }
    processedBody = tempBody;
  }

  const bodyPresence = getBodyPresence(processedBody, contentType);
  if (bodyPresence === "present" && (def.type !== "procedure" || !def.input)) {
    throw new InvalidRequestError(
      `A request body was provided when none was expected`,
    );
  }
  if (def.type === "query") {
    return;
  }
  if (bodyPresence === "missing" && def.input) {
    throw new InvalidRequestError(
      `A request body is expected but none was provided`,
    );
  }

  // mimetype
  const inputEncoding = normalizeMime(contentType || "");
  if (
    def.input?.encoding &&
    (!inputEncoding || !isValidEncoding(def.input?.encoding, inputEncoding))
  ) {
    if (!inputEncoding) {
      throw new InvalidRequestError(
        `Request encoding (Content-Type) required but not provided`,
      );
    } else {
      throw new InvalidRequestError(
        `Wrong request encoding (Content-Type): ${inputEncoding}`,
      );
    }
  }

  if (!inputEncoding) {
    // no input body
    return undefined;
  }

  // if input schema, validate
  if (def.input?.schema) {
    try {
      const lexBody = processedBody ? jsonToLex(processedBody) : processedBody;
      processedBody = lexicons.assertValidXrpcInput(nsid, lexBody);
    } catch (e) {
      throw new InvalidRequestError(e instanceof Error ? e.message : String(e));
    }
  }

  return {
    encoding: inputEncoding,
    body: processedBody,
  };
}

/**
 * Validates the output of an XRPC method against its lexicon definition.
 * Performs response body validation, content-type checks, and schema validation.
 * @param nsid - The namespace identifier of the method
 * @param def - The lexicon definition for the method
 * @param output - The handler output to validate
 * @param lexicons - The lexicon registry for schema validation
 * @throws {InternalServerError} If validation fails
 */
export function validateOutput(
  nsid: string,
  def: LexXrpcProcedure | LexXrpcQuery,
  output: HandlerSuccess | undefined,
  lexicons: Lexicons,
): void {
  // initial validation
  if (output) {
    handlerSuccess.parse(output);
  }

  // response expectation
  if (output?.body && !def.output) {
    throw new InternalServerError(
      `A response body was provided when none was expected`,
    );
  }
  if (!output?.body && def.output) {
    throw new InternalServerError(
      `A response body is expected but none was provided`,
    );
  }

  // mimetype
  if (
    def.output?.encoding &&
    (!output?.encoding ||
      !isValidEncoding(def.output?.encoding, output?.encoding))
  ) {
    throw new InternalServerError(
      `Invalid response encoding: ${output?.encoding}`,
    );
  }

  // output schema
  if (def.output?.schema) {
    try {
      const result = lexicons.assertValidXrpcOutput(nsid, output?.body);
      if (output) {
        output.body = result;
      }
    } catch (e) {
      throw new InternalServerError(e instanceof Error ? e.message : String(e));
    }
  }
}

/**
 * Normalizes a MIME type by extracting the base type and converting to lowercase.
 * Removes parameters (e.g., charset) from the MIME type.
 * @param mime - The MIME type string to normalize
 * @returns The normalized MIME type (base type only)
 */
export function normalizeMime(mime: string): string {
  const [base] = mime.split(";");
  return base.trim().toLowerCase();
}

/**
 * Checks if an actual encoding matches the expected encoding.
 * Supports wildcard matching and JSON aliases.
 * @param expected - The expected encoding from the lexicon
 * @param actual - The actual encoding from the request
 * @returns True if the encodings are compatible
 */
function isValidEncoding(expected: string, actual: string): boolean {
  if (expected === "*/*") return true;
  if (expected === actual) return true;
  if (expected === "application/json" && actual === "json") return true;
  return false;
}

/**
 * Determines if a request body is present or missing.
 * Considers empty strings and empty arrays as missing when no content type is provided.
 * @param body - The request body
 * @param contentType - The Content-Type header value
 * @returns "present" if body exists, "missing" otherwise
 */
function getBodyPresence(
  body: unknown,
  contentType: string | undefined | null,
): "present" | "missing" {
  if (body === undefined || body === null) {
    return "missing";
  }
  if (typeof body === "string" && body.length === 0 && !contentType) {
    return "missing";
  }
  if (body instanceof Uint8Array && body.length === 0 && !contentType) {
    return "missing";
  }
  return "present";
}

/**
 * Formats server timing data into an HTTP Server-Timing header value.
 * Creates a header string with timing metrics for performance monitoring.
 * @param timings - Array of timing measurements
 * @returns Formatted Server-Timing header value
 */
export function serverTimingHeader(timings: ServerTiming[]): string {
  return timings
    .map((timing) => {
      let header = timing.name;
      if (timing.duration) header += `;dur=${timing.duration}`;
      if (timing.description) header += `;desc="${timing.description}"`;
      return header;
    })
    .join(", ");
}

/**
 * Utility class for measuring server-side operation timings.
 * Provides start/stop functionality and implements the ServerTiming interface.
 */
export class ServerTimer implements ServerTiming {
  public duration?: number;
  private startMs?: number;
  /**
   * Creates a new ServerTimer instance.
   * @param name Identifier for the timing measurement
   * @param description Optional description of what is being timed
   */
  constructor(
    public name: string,
    public description?: string,
  ) {}
  /**
   * Starts the timer by recording the current timestamp.
   * @returns This timer instance for method chaining
   */
  start(): ServerTimer {
    this.startMs = Date.now();
    return this;
  }
  /**
   * Stops the timer and calculates the duration.
   * @returns This timer instance for method chaining
   * @throws {Error} If the timer hasn't been started
   */
  stop(): ServerTimer {
    assert(this.startMs, "timer hasn't been started");
    this.duration = Date.now() - this.startMs;
    return this;
  }
}

/**
 * Represents timing information for server-side operations.
 * Used for performance monitoring and debugging.
 */
export interface ServerTiming {
  name: string;
  duration?: number;
  description?: string;
}

/**
 * Represents a minimal HTTP request with essential properties.
 * Used when full request information is not needed.
 */
export interface MinimalRequest {
  url?: string;
  method?: string;
  headers: Headers | { [key: string]: string | string[] | undefined };
}

/**
 * Validates and extracts the NSID from a request object.
 * Convenience wrapper for parseUrlNsid that works with request objects.
 * @param req - The request object containing a URL
 * @returns The extracted NSID from the request URL
 * @throws {InvalidRequestError} If the URL doesn't contain a valid XRPC path
 */
export const parseReqNsid = (
  req: MinimalRequest | HonoRequest,
): string => parseUrlNsid(req.url || "/");

/**
 * Validates and extracts the NSID (Namespace Identifier) from an XRPC URL.
 * Performs strict validation of the /xrpc/ path format and NSID syntax.
 * @param url - The URL or path to parse
 * @returns The extracted NSID
 * @throws {InvalidRequestError} If the URL doesn't contain a valid XRPC path or NSID
 */
export const parseUrlNsid = (url: string): string => {
  // Extract path from full URL if needed
  let path = url;
  try {
    const urlObj = new URL(url);
    path = urlObj.pathname;
  } catch {
    // If URL parsing fails, assume it's already a path
  }

  if (
    // Ordered by likelihood of failure
    path.length <= 6 ||
    path[5] !== "/" ||
    path[4] !== "c" ||
    path[3] !== "p" ||
    path[2] !== "r" ||
    path[1] !== "x" ||
    path[0] !== "/"
  ) {
    throw new InvalidRequestError("invalid xrpc path");
  }

  const startOfNsid = 6;

  let curr = startOfNsid;
  let char: number;
  let alphaNumRequired = true;
  for (; curr < path.length; curr++) {
    char = path.charCodeAt(curr);
    if (
      (char >= 48 && char <= 57) || // 0-9
      (char >= 65 && char <= 90) || // A-Z
      (char >= 97 && char <= 122) // a-z
    ) {
      alphaNumRequired = false;
    } else if (char === 45 /* "-" */ || char === 46 /* "." */) {
      if (alphaNumRequired) {
        throw new InvalidRequestError("invalid xrpc path");
      }
      alphaNumRequired = true;
    } else if (char === 47 /* "/" */) {
      // Allow trailing slash (next char is either EOS or "?")
      if (curr === path.length - 1 || path.charCodeAt(curr + 1) === 63) {
        break;
      }
      throw new InvalidRequestError("invalid xrpc path");
    } else if (char === 63 /* "?"" */) {
      break;
    } else {
      throw new InvalidRequestError("invalid xrpc path");
    }
  }

  // last char was one of: '-', '.', '/'
  if (alphaNumRequired) {
    throw new InvalidRequestError("invalid xrpc path");
  }

  // A domain name consists of minimum two characters
  if (curr - startOfNsid < 2) {
    throw new InvalidRequestError("invalid xrpc path");
  }

  // @TODO is there a max ?

  return path.slice(startOfNsid, curr);
};

/**
 * Alias for parseUrlNsid for backward compatibility.
 * @deprecated Use parseUrlNsid instead
 */
export const extractUrlNsid = parseUrlNsid;

/**
 * Creates an input verifier function for XRPC methods.
 * Returns a function that validates and processes request input based on lexicon definitions.
 * @param lexicons - The lexicon registry for validation
 * @param nsid - The namespace identifier of the method
 * @param def - The lexicon definition for the method
 * @returns A function that verifies request input
 */
export function createInputVerifier(
  lexicons: Lexicons,
  nsid: string,
  def: LexXrpcProcedure | LexXrpcQuery,
) {
  return async (req: Request): Promise<HandlerInput | undefined> => {
    if (def.type === "query") {
      return undefined;
    }

    const contentType = req.headers.get("content-type");
    let body: unknown;

    // Clone the request to avoid consuming the body multiple times
    const clonedReq = req.clone();

    if (contentType?.includes("application/json")) {
      body = await clonedReq.json();
    } else if (contentType?.includes("text/")) {
      body = await clonedReq.text();
    } else {
      const arrayBuffer = await clonedReq.arrayBuffer();
      body = new Uint8Array(arrayBuffer);
    }

    return await validateInput(nsid, def, body, contentType, lexicons);
  };
}

/**
 * Sets headers on a Hono context response.
 * Iterates through the provided headers and sets them on the response.
 * @param c - The Hono context object
 * @param headers - Optional headers to set as key-value pairs
 */
export function setHeaders(c: Context, headers?: Record<string, string>) {
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      c.header(key, value);
    }
  }
}

/**
 * Converts a value to an array.
 * If the value is already an array, returns it as-is. Otherwise, wraps it in an array.
 * @template T - The type of the value
 * @param value - The value to convert to an array
 * @returns An array containing the value(s)
 */
export function asArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * Decodes query parameters from URL search params into a typed parameter object.
 * Converts arrays of single values to single values, preserves multiple values as arrays.
 * @param params - Raw query parameters as arrays of strings
 * @returns Decoded parameters with single values or arrays
 */
export function decodeUrlQueryParams(params: Record<string, string[]>): Params {
  const decoded: Params = {};

  for (const [key, values] of Object.entries(params)) {
    if (values.length === 1) {
      decoded[key] = values[0];
    } else if (values.length > 1) {
      decoded[key] = values;
    }
  }

  return decoded;
}
