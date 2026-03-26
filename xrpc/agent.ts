import type { DidString } from "@atp/lex";

export type FetchHandler = (
  path: `/${string}`,
  init: RequestInit,
) => Promise<Response>;

export interface Agent {
  readonly did?: DidString;
  fetchHandler: FetchHandler;
}

export function isAgent(value: unknown): value is Agent {
  return (
    typeof value === "object" &&
    value !== null &&
    "fetchHandler" in value &&
    typeof value.fetchHandler === "function" &&
    (!("did" in value) ||
      value.did === undefined ||
      typeof value.did === "string")
  );
}

export type AgentConfig = {
  did?: DidString;
  service: string | URL;
  headers?: HeadersInit;
  fetch?: typeof globalThis.fetch;
};

export type AgentOptions = AgentConfig | FetchHandler | string | URL;

export function buildAgent<O extends Agent | AgentOptions>(
  options: O,
): O extends Agent ? O : Agent;
export function buildAgent(options: Agent | AgentOptions): Agent {
  const config: Agent | AgentConfig = typeof options === "function"
    ? { did: undefined, fetchHandler: options }
    : typeof options === "string" || options instanceof URL
    ? { did: undefined, service: options }
    : options;

  if (isAgent(config)) {
    return config;
  }

  const { service, fetch = globalThis.fetch } = config;

  if (typeof fetch !== "function") {
    throw new TypeError("fetch() is not available in this environment");
  }

  return {
    get did() {
      return config.did;
    },
    fetchHandler(path, init) {
      const headers = config.headers != null && init.headers != null
        ? mergeHeaders(config.headers, init.headers)
        : config.headers || init.headers;

      return fetch(
        new URL(path, service),
        headers !== init.headers ? { ...init, headers } : init,
      );
    },
  };
}

function mergeHeaders(
  defaultHeaders: HeadersInit,
  requestHeaders: HeadersInit,
): Headers {
  const result = new Headers(defaultHeaders);
  const overrides = requestHeaders instanceof Headers
    ? requestHeaders
    : new Headers(requestHeaders);

  for (const [key, value] of overrides.entries()) {
    result.set(key, value);
  }

  return result;
}
