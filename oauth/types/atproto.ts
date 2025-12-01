import { z } from "zod";
import { isOAuthScope, type OAuthScope } from "./core.ts";
import { isSpaceSeparatedValue, type SpaceSeparatedValue } from "./util.ts";
import {
  LOOPBACK_CLIENT_ID_ORIGIN,
  type OAuthClientIdLoopback,
  parseOAuthLoopbackClientId,
  type OAuthClientMetadataInput,
} from "./client.ts";
import {
  oauthLoopbackClientRedirectUriSchema,
  type OAuthLoopbackRedirectURI,
} from "./redirect-uri.ts";
import { arrayEquivalent, asArray } from "./util.ts";
import { oauthTokenResponseSchema } from "./responses.ts";

export const DEFAULT_LOOPBACK_CLIENT_REDIRECT_URIS = Object.freeze(
  [
    `http://127.0.0.1/`,
    `http://[::1]/`,
  ] as const,
);

export const ATPROTO_SCOPE_VALUE = "atproto";
export type AtprotoScopeValue = typeof ATPROTO_SCOPE_VALUE;

export type AtprotoOAuthScope =
  & OAuthScope
  & SpaceSeparatedValue<AtprotoScopeValue>;

export function isAtprotoOAuthScope(input: string): input is AtprotoOAuthScope {
  return (
    isOAuthScope(input) && isSpaceSeparatedValue(ATPROTO_SCOPE_VALUE, input)
  );
}

export function asAtprotoOAuthScope<I extends string>(input: I) {
  if (isAtprotoOAuthScope(input)) return input;
  throw new TypeError(
    `Value must contain "${ATPROTO_SCOPE_VALUE}" scope value`,
  );
}

export function assertAtprotoOAuthScope(
  input: string,
): asserts input is AtprotoOAuthScope {
  void asAtprotoOAuthScope(input);
}

export const atprotoOAuthScopeSchema = z.string().refine(isAtprotoOAuthScope, {
  message: "Invalid ATProto OAuth scope",
});

export const DEFAULT_ATPROTO_OAUTH_SCOPE =
  ATPROTO_SCOPE_VALUE satisfies AtprotoOAuthScope;

export type OAuthLoopbackClientIdConfig = {
  scope?: string;
  redirect_uris?: Iterable<string>;
};

export function buildAtprotoLoopbackClientId(
  config?: OAuthLoopbackClientIdConfig,
): OAuthClientIdLoopback {
  if (config) {
    const params = new URLSearchParams();

    const { scope } = config;
    if (scope != null && scope !== DEFAULT_ATPROTO_OAUTH_SCOPE) {
      params.set("scope", asAtprotoOAuthScope(scope));
    }

    const redirectUris = asArray(config.redirect_uris);
    if (
      redirectUris &&
      !arrayEquivalent(redirectUris, DEFAULT_LOOPBACK_CLIENT_REDIRECT_URIS)
    ) {
      if (!redirectUris.length) {
        throw new TypeError(`Unexpected empty "redirect_uris" config`);
      }
      for (const uri of redirectUris) {
        params.append(
          "redirect_uri",
          oauthLoopbackClientRedirectUriSchema.parse(uri),
        );
      }
    }

    if (params.size) {
      return `${LOOPBACK_CLIENT_ID_ORIGIN}?${params.toString()}`;
    }
  }

  return LOOPBACK_CLIENT_ID_ORIGIN;
}

export type AtprotoLoopbackClientIdParams = {
  scope: AtprotoOAuthScope;
  redirect_uris: [OAuthLoopbackRedirectURI, ...OAuthLoopbackRedirectURI[]];
};

export function parseAtprotoLoopbackClientId(
  clientId: string,
): AtprotoLoopbackClientIdParams {
  const { scope = DEFAULT_ATPROTO_OAUTH_SCOPE, redirect_uris } =
    parseOAuthLoopbackClientId(clientId);
  if (!isAtprotoOAuthScope(scope)) {
    throw new TypeError(
      'ATProto Loopback ClientID must include "atproto" scope',
    );
  }
  return {
    scope,
    redirect_uris: redirect_uris ?? [...DEFAULT_LOOPBACK_CLIENT_REDIRECT_URIS],
  };
}

export type AtprotoLoopbackClientMetadata = OAuthClientMetadataInput & {
  client_id: OAuthClientIdLoopback;
  scope: AtprotoOAuthScope;
  redirect_uris: [OAuthLoopbackRedirectURI, ...OAuthLoopbackRedirectURI[]];
};

export function atprotoLoopbackClientMetadata(
  clientId: string,
): AtprotoLoopbackClientMetadata {
  const params = parseAtprotoLoopbackClientId(clientId);
  return buildMetadataInternal(clientId as OAuthClientIdLoopback, params);
}

export function buildAtprotoLoopbackClientMetadata(
  config: OAuthLoopbackClientIdConfig,
): AtprotoLoopbackClientMetadata {
  const clientId = buildAtprotoLoopbackClientId(config);
  return buildMetadataInternal(
    clientId,
    parseAtprotoLoopbackClientId(clientId),
  );
}

function buildMetadataInternal(
  clientId: OAuthClientIdLoopback,
  clientParams: AtprotoLoopbackClientIdParams,
): AtprotoLoopbackClientMetadata {
  return {
    client_id: clientId,
    scope: clientParams.scope,
    redirect_uris: clientParams.redirect_uris,
    response_types: ["code"],
    grant_types: ["authorization_code", "refresh_token"],
    token_endpoint_auth_method: "none",
    application_type: "native",
    dpop_bound_access_tokens: true,
  };
}

export const atprotoOAuthTokenResponseSchema = oauthTokenResponseSchema.extend({
  token_type: z.literal("DPoP"),
  sub: z.string(),
  scope: atprotoOAuthScopeSchema,
  id_token: z.never().optional(),
});

export type AtprotoOAuthTokenResponse = z.output<
  typeof atprotoOAuthTokenResponseSchema
>;

