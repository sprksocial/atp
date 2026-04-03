import { Procedure, type Query } from "@atp/lex";
import {
  type Agent,
  type AgentOptions,
  buildAgent,
  type FetchHandler,
} from "./agent.ts";
import {
  type Gettable,
  httpResponseCodeToEnum,
  ResponseType,
  type XrpcCallOptions,
  XRPCError,
  XRPCInvalidResponseError,
  XRPCResponse,
} from "./types.ts";
import {
  combineHeaders,
  encodeMethodCallBody,
  httpResponseBodyParse,
  isErrorResponseBody,
} from "./util.ts";
import type { DidString } from "../lex/core/string-format.ts";

type XrpcMethod = Query | Procedure;

export class XrpcClient {
  readonly agent: Agent;
  readonly fetchHandler: FetchHandler;
  readonly headers: Map<string, Gettable<null | string>> = new Map<
    string,
    Gettable<null | string>
  >();

  constructor(
    agentOpts: Agent | AgentOptions,
  ) {
    this.agent = buildAgent(agentOpts);
    this.fetchHandler = this.agent.fetchHandler;
  }

  get did(): DidString | undefined {
    return this.agent.did;
  }

  setHeader(key: string, value: Gettable<null | string>): void {
    this.headers.set(key.toLowerCase(), value);
  }

  unsetHeader(key: string): void {
    this.headers.delete(key.toLowerCase());
  }

  clearHeaders(): void {
    this.headers.clear();
  }

  async call<const M extends XrpcMethod>(
    method: M,
    options: XrpcCallOptions<M> = {} as XrpcCallOptions<M>,
  ): Promise<XRPCResponse> {
    const params = this.getValidatedParams(method, options);
    const reqUrl = this.constructMethodCallUrl(method, params);
    const reqHeaders = this.constructMethodCallHeaders(method, options);
    const reqBody = this.constructMethodCallBody(method, reqHeaders, options);

    const init: RequestInit & { duplex: "half" } = {
      method: method instanceof Procedure ? "post" : "get",
      headers: combineHeaders(reqHeaders, this.headers),
      body: reqBody,
      duplex: "half",
      redirect: "follow",
      signal: options.signal,
    };

    try {
      const response = await this.fetchHandler(reqUrl as `/${string}`, init);

      const resStatus = response.status;
      const resHeaders = Object.fromEntries(response.headers.entries());
      const resBodyBytes = await response.arrayBuffer();
      let resBody = this.parseResponseBody(
        response.headers.get("content-type"),
        resBodyBytes,
      );

      const resCode = httpResponseCodeToEnum(resStatus);
      if (resCode !== ResponseType.Success) {
        const { error = undefined, message = undefined } =
          resBody && isErrorResponseBody(resBody) ? resBody : {};
        throw new XRPCError(resCode, error, message, resHeaders);
      }

      this.assertValidResponseEncoding(method, response, resBody);

      if (options.validateResponse !== false && method.output.schema) {
        const result = method.output.schema.safeParse(resBody);
        if (!result.success) {
          throw new XRPCInvalidResponseError(
            method.nsid,
            result.error,
            resBody,
          );
        }
        resBody = result.value;
      }

      return new XRPCResponse(resBody, resHeaders);
    } catch (err) {
      throw XRPCError.from(err);
    }
  }

  private getValidatedParams<M extends XrpcMethod>(
    method: M,
    options: XrpcCallOptions<M>,
  ): Record<string, unknown> | undefined {
    if (options.validateRequest !== true) {
      return options.params as Record<string, unknown> | undefined;
    }

    const result = method.parameters.safeParse(options.params);
    if (!result.success) {
      throw new XRPCError(
        ResponseType.InvalidRequest,
        undefined,
        result.error.message,
        undefined,
        { cause: result.error },
      );
    }

    return result.value as Record<string, unknown> | undefined;
  }

  private constructMethodCallUrl(
    method: XrpcMethod,
    params?: Record<string, unknown>,
  ): string {
    const pathname = `/xrpc/${encodeURIComponent(method.nsid)}`;
    const searchParams = method.parameters.toURLSearchParams(
      (params ?? {}) as Record<string, unknown>,
    );
    const query = searchParams.toString();
    return query.length > 0 ? `${pathname}?${query}` : pathname;
  }

  private constructMethodCallHeaders<M extends XrpcMethod>(
    method: M,
    options: XrpcCallOptions<M>,
  ): Headers {
    const headers = new Headers();

    if (options.headers != null) {
      for (const [name, value] of Object.entries(options.headers)) {
        if (value !== undefined) {
          headers.set(name, value);
        }
      }
    }

    if (method.output.encoding !== undefined) {
      headers.set("accept", method.output.encoding);
    }

    return headers;
  }

  private constructMethodCallBody<M extends XrpcMethod>(
    method: M,
    headers: Headers,
    options: XrpcCallOptions<M>,
  ): BodyInit | undefined {
    if (!(method instanceof Procedure)) {
      return undefined;
    }

    let body = options.body as unknown;

    if (options.validateRequest === true && method.input.schema) {
      const result = method.input.schema.safeParse(body);
      if (!result.success) {
        throw new XRPCError(
          ResponseType.InvalidRequest,
          undefined,
          result.error.message,
          undefined,
          { cause: result.error },
        );
      }
      body = result.value;
    }

    const headerEncoding = headers.get("content-type") ?? undefined;
    if (
      options.encoding !== undefined &&
      headerEncoding !== undefined &&
      !matchesEncoding(options.encoding, headerEncoding)
    ) {
      throw new XRPCError(
        ResponseType.InvalidRequest,
        undefined,
        `Conflicting content-type values: ${options.encoding} and ${headerEncoding}`,
      );
    }

    const resolved = resolveProcedurePayload(
      method.input.encoding,
      body,
      options.encoding ?? headerEncoding,
    );

    if (resolved === undefined) {
      headers.delete("content-type");
      return undefined;
    }

    headers.set("content-type", resolved.encoding);
    return encodeMethodCallBody(headers, body);
  }

  private parseResponseBody(
    mimeType: string | null,
    data: ArrayBuffer,
  ): unknown {
    if (data.byteLength === 0 && mimeType == null) {
      return undefined;
    }

    return httpResponseBodyParse(mimeType, data);
  }

  private assertValidResponseEncoding(
    method: XrpcMethod,
    response: Response,
    body: unknown,
  ): void {
    const expected = method.output.encoding;
    const contentType = response.headers.get("content-type");

    if (expected === undefined) {
      if (body !== undefined) {
        throw new XRPCError(
          ResponseType.InvalidResponse,
          undefined,
          `Expected empty response body for ${method.nsid}`,
        );
      }
      return;
    }

    if (contentType == null) {
      throw new XRPCError(
        ResponseType.InvalidResponse,
        undefined,
        `Missing content-type in response for ${method.nsid}`,
      );
    }

    if (!matchesEncoding(expected, contentType)) {
      throw new XRPCError(
        ResponseType.InvalidResponse,
        undefined,
        `Unexpected response content-type: ${contentType}`,
      );
    }
  }
}

function resolveProcedurePayload(
  schemaEncoding: string | undefined,
  body: unknown,
  encodingHint: string | undefined,
): undefined | { encoding: string } {
  if (schemaEncoding === undefined) {
    if (body !== undefined) {
      throw new XRPCError(
        ResponseType.InvalidRequest,
        undefined,
        "Cannot send a request body for a method without input payload",
      );
    }
    if (encodingHint !== undefined) {
      throw new XRPCError(
        ResponseType.InvalidRequest,
        undefined,
        `Unexpected encoding hint (${encodingHint})`,
      );
    }
    return undefined;
  }

  if (body === undefined) {
    throw new XRPCError(
      ResponseType.InvalidRequest,
      undefined,
      "A request body is expected but none was provided",
    );
  }

  return {
    encoding: resolveEncoding(schemaEncoding, body, encodingHint),
  };
}

function resolveEncoding(
  schemaEncoding: string,
  body: unknown,
  encodingHint: string | undefined,
): string {
  if (encodingHint != null && encodingHint.length > 0) {
    if (!matchesEncoding(schemaEncoding, encodingHint)) {
      throw new XRPCError(
        ResponseType.InvalidRequest,
        undefined,
        `Cannot send content-type "${encodingHint}" for "${schemaEncoding}" encoding`,
      );
    }
    return encodingHint;
  }

  const inferredEncoding = inferEncoding(body);
  if (
    inferredEncoding !== undefined &&
    matchesEncoding(schemaEncoding, inferredEncoding)
  ) {
    return inferredEncoding;
  }

  if (schemaEncoding === "*/*") {
    return "application/octet-stream";
  }

  if (schemaEncoding.startsWith("text/")) {
    if (!schemaEncoding.includes("*")) {
      return `${schemaEncoding};charset=UTF-8`;
    }
    return "text/plain;charset=UTF-8";
  }

  if (!schemaEncoding.includes("*")) {
    return schemaEncoding;
  }

  if (
    isBlobLike(body) &&
    body.type.length > 0 &&
    matchesEncoding(schemaEncoding, body.type)
  ) {
    return body.type;
  }

  if (schemaEncoding.startsWith("application/")) {
    return "application/octet-stream";
  }

  throw new XRPCError(
    ResponseType.InvalidRequest,
    undefined,
    `Unable to determine payload encoding for ${schemaEncoding}`,
  );
}

function inferEncoding(body: unknown): string | undefined {
  if (
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    isReadableStreamLike(body)
  ) {
    return "application/octet-stream";
  }

  if (isFormDataLike(body)) {
    return "multipart/form-data";
  }

  if (isURLSearchParamsLike(body)) {
    return "application/x-www-form-urlencoded;charset=UTF-8";
  }

  if (isBlobLike(body)) {
    return body.type || "application/octet-stream";
  }

  if (typeof body === "string") {
    return "text/plain;charset=UTF-8";
  }

  if (isIterable(body)) {
    return "application/octet-stream";
  }

  if (
    typeof body === "boolean" ||
    typeof body === "number" ||
    typeof body === "object"
  ) {
    return "application/json";
  }

  return undefined;
}

function matchesEncoding(pattern: string, value: string): boolean {
  const normalizedPattern = normalizeEncoding(pattern);
  const normalizedValue = normalizeEncoding(value);

  if (normalizedPattern === "*/*") {
    return true;
  }

  const [patternType, patternSubtype] = normalizedPattern.split("/");
  const [valueType, valueSubtype] = normalizedValue.split("/");

  if (
    patternType == null ||
    patternSubtype == null ||
    valueType == null ||
    valueSubtype == null
  ) {
    return false;
  }

  if (patternType !== "*" && patternType !== valueType) {
    return false;
  }

  if (patternSubtype !== "*" && patternSubtype !== valueSubtype) {
    return false;
  }

  return true;
}

function normalizeEncoding(encoding: string): string {
  return encoding.split(";", 1)[0].trim().toLowerCase();
}

function isBlobLike(value: unknown): value is Blob {
  if (value == null) return false;
  if (typeof value !== "object") return false;
  if (typeof Blob === "function" && value instanceof Blob) return true;

  const tag = (value as Record<string | symbol, unknown>)[Symbol.toStringTag];
  if (tag === "Blob" || tag === "File") {
    return "stream" in value && typeof value.stream === "function";
  }

  return false;
}

function isReadableStreamLike(value: unknown): value is ReadableStream {
  return typeof ReadableStream === "function" &&
    value instanceof ReadableStream;
}

function isFormDataLike(value: unknown): value is FormData {
  return typeof FormData === "function" && value instanceof FormData;
}

function isURLSearchParamsLike(value: unknown): value is URLSearchParams {
  return typeof URLSearchParams === "function" &&
    value instanceof URLSearchParams;
}

function isIterable(
  value: unknown,
): value is Iterable<unknown> | AsyncIterable<unknown> {
  return value != null &&
    typeof value === "object" &&
    (Symbol.iterator in value || Symbol.asyncIterator in value);
}
