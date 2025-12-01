import { z } from "zod";
import { jwksPubSchema } from "@atp/jwk";
import { oauthClientIdSchema } from "./core.ts";
import { oauthEndpointAuthMethod } from "./core.ts";
import { oauthGrantTypeSchema } from "./core.ts";
import { oauthRedirectUriSchema } from "./redirect-uri.ts";
import { oauthResponseTypeSchema } from "./core.ts";
import { oauthScopeSchema } from "./core.ts";
import { webUriSchema } from "./uri.ts";
import {
  oauthLoopbackClientRedirectUriSchema,
  type OAuthLoopbackRedirectURI,
} from "./redirect-uri.ts";
import type { OAuthScope } from "./core.ts";
import { httpsUriSchema } from "./uri.ts";
import { extractUrlPath, isHostnameIP } from "./util.ts";

export const LOOPBACK_CLIENT_ID_ORIGIN = "http://localhost";

export type OAuthClientIdLoopback = `http://localhost${"" | `/`}${
  | ""
  | `?${string}`}`;

export type OAuthLoopbackClientIdParams = {
  scope?: OAuthScope;
  redirect_uris?: [OAuthLoopbackRedirectURI, ...OAuthLoopbackRedirectURI[]];
};

export const oauthClientIdLoopbackSchema = oauthClientIdSchema.superRefine(
  (input, ctx) => {
    const result = safeParseOAuthLoopbackClientId(input);
    if (!result.success) {
      ctx.addIssue({ code: "custom", message: result.message });
    }
  },
);

export function assertOAuthLoopbackClientId(
  input: string,
): asserts input is OAuthClientIdLoopback {
  void parseOAuthLoopbackClientId(input);
}

export function isOAuthClientIdLoopback<T extends string>(
  input: T,
): input is T & OAuthClientIdLoopback {
  return safeParseOAuthLoopbackClientId(input).success;
}

export function asOAuthClientIdLoopback<T extends string>(input: T) {
  assertOAuthLoopbackClientId(input);
  return input;
}

export function parseOAuthLoopbackClientId(
  input: string,
): OAuthLoopbackClientIdParams {
  const result = safeParseOAuthLoopbackClientId(input);
  if (result.success) return result.value;

  throw new TypeError(`Invalid loopback client ID: ${result.message}`);
}

type LightParseReturnType<T> =
  | { success: true; value: T }
  | { success: false; message: string };

export function safeParseOAuthLoopbackClientId(
  input: string,
): LightParseReturnType<OAuthLoopbackClientIdParams> {
  if (!input.startsWith(LOOPBACK_CLIENT_ID_ORIGIN)) {
    return {
      success: false,
      message: `Value must start with "${LOOPBACK_CLIENT_ID_ORIGIN}"`,
    };
  }

  if (input.includes("#", LOOPBACK_CLIENT_ID_ORIGIN.length)) {
    return {
      success: false,
      message: "Value must not contain a hash component",
    };
  }

  const queryStringIdx = input.length > LOOPBACK_CLIENT_ID_ORIGIN.length &&
      input.charCodeAt(LOOPBACK_CLIENT_ID_ORIGIN.length) === 0x2f
    ? LOOPBACK_CLIENT_ID_ORIGIN.length + 1
    : LOOPBACK_CLIENT_ID_ORIGIN.length;

  if (
    input.length !== queryStringIdx &&
    input.charCodeAt(queryStringIdx) !== 0x3f
  ) {
    return {
      success: false,
      message: "Value must not contain a path component",
    };
  }

  const queryString = input.slice(queryStringIdx + 1);
  return safeParseOAuthLoopbackClientIdQueryString(queryString);
}

export function safeParseOAuthLoopbackClientIdQueryString(
  input: string | Iterable<[key: string, value: string]>,
): LightParseReturnType<OAuthLoopbackClientIdParams> {
  const params: OAuthLoopbackClientIdParams = {};

  const it = typeof input === "string" ? new URLSearchParams(input) : input;
  for (const [key, value] of it) {
    if (key === "scope") {
      if ("scope" in params) {
        return {
          success: false,
          message: 'Duplicate "scope" query parameter',
        };
      }

      const res = oauthScopeSchema.safeParse(value);
      if (!res.success) {
        const reason = res.error.issues.map((i) => i.message).join(", ");
        return {
          success: false,
          message: `Invalid "scope" query parameter: ${
            reason || "Validation failed"
          }`,
        };
      }

      params.scope = res.data;
    } else if (key === "redirect_uri") {
      const res = oauthLoopbackClientRedirectUriSchema.safeParse(value);
      if (!res.success) {
        const reason = res.error.issues.map((i) => i.message).join(", ");
        return {
          success: false,
          message: `Invalid "redirect_uri" query parameter: ${
            reason || "Validation failed"
          }`,
        };
      }

      if (params.redirect_uris == null) params.redirect_uris = [res.data];
      else params.redirect_uris.push(res.data);
    } else {
      return {
        success: false,
        message: `Unexpected query parameter "${key}"`,
      };
    }
  }

  return {
    success: true,
    value: params,
  };
}

export const oauthClientIdDiscoverableSchema: z.ZodIntersection<z.ZodString, z.ZodString> = z
  .intersection(oauthClientIdSchema, httpsUriSchema)
  .superRefine((value, ctx) => {
    const url = new URL(value);

    if (url.username || url.password) {
      ctx.addIssue({
        code: "custom",
        message: "ClientID must not contain credentials",
      });
      return;
    }

    if (url.hash) {
      ctx.addIssue({
        code: "custom",
        message: "ClientID must not contain a fragment",
      });
      return;
    }

    if (url.pathname === "/") {
      ctx.addIssue({
        code: "custom",
        message:
          'ClientID must contain a path component (e.g. "/client-metadata.json")',
      });
      return;
    }

    if (url.pathname.endsWith("/")) {
      ctx.addIssue({
        code: "custom",
        message: "ClientID path must not end with a trailing slash",
      });
      return;
    }

    if (isHostnameIP(url.hostname)) {
      ctx.addIssue({
        code: "custom",
        message: "ClientID hostname must not be an IP address",
      });
      return;
    }

    if (extractUrlPath(value) !== url.pathname) {
      ctx.addIssue({
        code: "custom",
        message:
          `ClientID must be in canonical form ("${url.href}", got "${value}")`,
      });
      return;
    }
  });

export type OAuthClientIdDiscoverable = z.output<
  typeof oauthClientIdDiscoverableSchema
>;

export function isOAuthClientIdDiscoverable(
  clientId: string,
): clientId is OAuthClientIdDiscoverable {
  return oauthClientIdDiscoverableSchema.safeParse(clientId).success;
}

export const conventionalOAuthClientIdSchema = oauthClientIdDiscoverableSchema
  .superRefine(
    (value, ctx) => {
      const url = new URL(value);

      if (url.port) {
        ctx.addIssue({
          code: "custom",
          message: "ClientID must not contain a port",
        });
        return;
      }

      if (url.search) {
        ctx.addIssue({
          code: "custom",
          message: "ClientID must not contain a query string",
        });
        return;
      }

      if (url.pathname !== "/oauth-client-metadata.json") {
        ctx.addIssue({
          code: "custom",
          message: 'ClientID must be "/oauth-client-metadata.json"',
        });
        return;
      }
    },
  );

export type ConventionalOAuthClientId = z.output<
  typeof conventionalOAuthClientIdSchema
>;

export function isConventionalOAuthClientId(
  clientId: string,
): clientId is ConventionalOAuthClientId {
  return conventionalOAuthClientIdSchema.safeParse(clientId).success;
}

export function assertOAuthDiscoverableClientId(
  value: string,
): asserts value is OAuthClientIdDiscoverable {
  void oauthClientIdDiscoverableSchema.parse(value);
}

export function parseOAuthDiscoverableClientId(clientId: string): URL {
  return new URL(oauthClientIdDiscoverableSchema.parse(clientId));
}

export const oauthClientMetadataSchema = z.object({
  redirect_uris: z.array(oauthRedirectUriSchema).nonempty(),
  response_types: z
    .array(oauthResponseTypeSchema)
    .nonempty()
    .default(["code"]),
  grant_types: z
    .array(oauthGrantTypeSchema)
    .nonempty()
    .default(["authorization_code"]),
  scope: oauthScopeSchema.optional(),
  token_endpoint_auth_method: oauthEndpointAuthMethod
    .default("client_secret_basic"),
  token_endpoint_auth_signing_alg: z.string().optional(),
  userinfo_signed_response_alg: z.string().optional(),
  userinfo_encrypted_response_alg: z.string().optional(),
  jwks_uri: webUriSchema.optional(),
  jwks: jwksPubSchema.optional(),
  application_type: z.enum(["web", "native"]).default("web"),
  subject_type: z.enum(["public", "pairwise"]).default("public"),
  request_object_signing_alg: z.string().optional(),
  id_token_signed_response_alg: z.string().optional(),
  authorization_signed_response_alg: z.string().default("RS256"),
  authorization_encrypted_response_enc: z.enum(["A128CBC-HS256"]).optional(),
  authorization_encrypted_response_alg: z.string().optional(),
  client_id: oauthClientIdSchema.optional(),
  client_name: z.string().optional(),
  client_uri: webUriSchema.optional(),
  policy_uri: webUriSchema.optional(),
  tos_uri: webUriSchema.optional(),
  logo_uri: webUriSchema.optional(),
  default_max_age: z.number().optional(),
  require_auth_time: z.boolean().optional(),
  contacts: z.array(z.string().email()).optional(),
  tls_client_certificate_bound_access_tokens: z.boolean().optional(),
  dpop_bound_access_tokens: z.boolean().optional(),
  authorization_details_types: z.array(z.string()).optional(),
});

export type OAuthClientMetadata = z.infer<typeof oauthClientMetadataSchema>;
export type OAuthClientMetadataInput = z.input<
  typeof oauthClientMetadataSchema
>;

import { signedJwtSchema } from "@atp/jwk";
import { CLIENT_ASSERTION_TYPE_JWT_BEARER } from "./constants.ts";

export const oauthClientCredentialsJwtBearerSchema = z.object({
  client_id: oauthClientIdSchema,
  client_assertion_type: z.literal(CLIENT_ASSERTION_TYPE_JWT_BEARER),
  client_assertion: signedJwtSchema,
});

export type OAuthClientCredentialsJwtBearer = z.infer<
  typeof oauthClientCredentialsJwtBearerSchema
>;

export const oauthClientCredentialsSecretPostSchema = z.object({
  client_id: oauthClientIdSchema,
  client_secret: z.string(),
});

export type OAuthClientCredentialsSecretPost = z.infer<
  typeof oauthClientCredentialsSecretPostSchema
>;

export const oauthClientCredentialsNoneSchema = z.object({
  client_id: oauthClientIdSchema,
});

export type OAuthClientCredentialsNone = z.infer<
  typeof oauthClientCredentialsNoneSchema
>;

export const oauthClientCredentialsSchema = z.union([
  oauthClientCredentialsJwtBearerSchema,
  oauthClientCredentialsSecretPostSchema,
  oauthClientCredentialsNoneSchema,
]);

export type OAuthClientCredentials = z.infer<
  typeof oauthClientCredentialsSchema
>;

