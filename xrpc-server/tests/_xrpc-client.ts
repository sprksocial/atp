import { l, type Procedure, Query, type Validator } from "@atp/lex";
import type { LexiconDoc } from "@atp/lexicon";
import {
  type Agent,
  type AgentOptions,
  ResponseType,
  type XrpcCallOptions,
  XrpcClient as ModernXrpcClient,
  XRPCError,
  XRPCInvalidResponseError,
  type XRPCResponse,
} from "@atp/xrpc";

type Method = Query | Procedure;

type LegacyCallOptions = {
  encoding?: string;
  signal?: AbortSignal;
  headers?: Record<string, string | undefined>;
  validateRequest?: boolean;
  validateResponse?: boolean;
};

type LexRecord = Record<string, unknown>;

export { ResponseType, XRPCError, XRPCInvalidResponseError };

export class XrpcClient {
  readonly #client: ModernXrpcClient;
  readonly #methods: Map<string, Method>;

  constructor(agentOpts: Agent | AgentOptions, lexicons: LexiconDoc[] = []) {
    this.#client = new ModernXrpcClient(agentOpts);
    this.#methods = buildMethodMap(lexicons);
  }

  get did() {
    return this.#client.did;
  }

  setHeader(
    key: string,
    value: string | null | (() => string | null),
  ): void {
    this.#client.setHeader(key, value);
  }

  unsetHeader(key: string): void {
    this.#client.unsetHeader(key);
  }

  clearHeaders(): void {
    this.#client.clearHeaders();
  }

  async call(
    nsid: string,
    params?: Record<string, unknown>,
    dataOrOptions?: unknown,
    options?: LegacyCallOptions,
  ): Promise<XRPCResponse> {
    const method = this.#methods.get(nsid) ?? l.query(
      nsid as `${string}.${string}.${string}`,
      l.params(),
      l.payload(),
    );
    if (method instanceof Query) {
      const callOptions = options ?? toLegacyCallOptions(dataOrOptions);
      return await this.#client.call(
        method,
        {
          params,
          encoding: callOptions?.encoding,
          signal: callOptions?.signal,
          headers: callOptions?.headers,
          validateRequest: callOptions?.validateRequest,
          validateResponse: callOptions?.validateResponse,
        } as XrpcCallOptions<typeof method>,
      );
    }

    return await this.#client.call(
      method,
      {
        params,
        body: dataOrOptions,
        encoding: options?.encoding,
        signal: options?.signal,
        headers: options?.headers,
        validateRequest: options?.validateRequest,
        validateResponse: options?.validateResponse,
      } as XrpcCallOptions<typeof method>,
    );
  }
}

function buildMethodMap(lexicons: LexiconDoc[]): Map<string, Method> {
  const methods = new Map<string, Method>();

  for (const lexicon of lexicons) {
    const defs = asRecord(lexicon.defs);
    const main = asRecord(defs?.main);
    if (main == null) {
      continue;
    }

    const params = compileParams(main.parameters);
    const errors = compileErrors(main.errors);
    if (main.type === "query") {
      methods.set(
        lexicon.id,
        l.query(
          lexicon.id as `${string}.${string}.${string}`,
          params,
          compilePayload(main.output),
          errors,
        ),
      );
      continue;
    }

    if (main.type === "procedure") {
      methods.set(
        lexicon.id,
        l.procedure(
          lexicon.id as `${string}.${string}.${string}`,
          params,
          compilePayload(main.input),
          compilePayload(main.output),
          errors,
        ),
      );
    }
  }

  return methods;
}

function compileErrors(definition: unknown): readonly string[] | undefined {
  if (!Array.isArray(definition)) {
    return undefined;
  }
  const errors: string[] = [];
  for (const item of definition) {
    const error = asRecord(item);
    if (error == null || typeof error.name !== "string") {
      continue;
    }
    errors.push(error.name);
  }
  return errors.length > 0 ? errors : undefined;
}

function compilePayload(definition: unknown) {
  const payload = asRecord(definition);
  const encoding = typeof payload?.encoding === "string"
    ? payload.encoding
    : undefined;
  const schema = compileSchema(payload?.schema);
  if (schema === undefined) {
    return l.payload(encoding);
  }
  return l.payload(encoding, schema);
}

function compileParams(definition: unknown) {
  const params = asRecord(definition);
  const properties = asRecord(params?.properties);
  if (properties == null) {
    return l.params();
  }

  const required = new Set(toStringArray(params?.required));
  const validators: Record<string, Validator> = {};
  for (const [key, value] of Object.entries(properties)) {
    const schema = compileSchema(value);
    if (schema === undefined) {
      continue;
    }
    if (required.has(key) || hasDefault(value)) {
      validators[key] = schema;
    } else {
      validators[key] = l.optional(schema);
    }
  }
  return l.params(validators);
}

function compileSchema(definition: unknown): Validator | undefined {
  const schema = asRecord(definition);
  if (schema == null) {
    return undefined;
  }

  switch (schema.type) {
    case "boolean":
      return l.boolean({
        default: getBoolean(schema.default),
        const: getBoolean(schema.const),
      });
    case "integer":
      return l.integer({
        default: getNumber(schema.default),
        minimum: getNumber(schema.minimum),
        maximum: getNumber(schema.maximum),
        const: getNumber(schema.const),
      });
    case "string":
      return l.string({
        default: getString(schema.default),
        minLength: getNumber(schema.minLength),
        maxLength: getNumber(schema.maxLength),
      });
    case "array": {
      const items = compileSchema(schema.items) ?? l.unknown();
      return l.array(items, {
        minLength: getNumber(schema.minLength),
        maxLength: getNumber(schema.maxLength),
      });
    }
    case "object": {
      const properties = asRecord(schema.properties) ?? {};
      const required = new Set(toStringArray(schema.required));
      const fields: Record<string, Validator> = {};
      for (const [key, value] of Object.entries(properties)) {
        const fieldSchema = compileSchema(value);
        if (fieldSchema === undefined) {
          continue;
        }
        if (required.has(key) || hasDefault(value)) {
          fields[key] = fieldSchema;
        } else {
          fields[key] = l.optional(fieldSchema);
        }
      }
      return l.object(fields);
    }
    case "bytes":
      return l.bytes({
        minLength: getNumber(schema.minLength),
        maxLength: getNumber(schema.maxLength),
      });
    case "cid-link":
      return l.cidLink();
    default:
      return l.unknown();
  }
}

function toLegacyCallOptions(value: unknown): LegacyCallOptions | undefined {
  const options = asRecord(value);
  if (options == null) {
    return undefined;
  }
  if (
    !("encoding" in options) &&
    !("signal" in options) &&
    !("headers" in options) &&
    !("validateRequest" in options) &&
    !("validateResponse" in options)
  ) {
    return undefined;
  }
  return options as LegacyCallOptions;
}

function hasDefault(value: unknown): boolean {
  const schema = asRecord(value);
  return schema != null && "default" in schema;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function asRecord(value: unknown): LexRecord | undefined {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as LexRecord;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
