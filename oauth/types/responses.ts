import { z } from "zod";
import { signedJwtSchema } from "@atp/jwk";
import { oauthAuthorizationDetailsSchema } from "./authorization-details.ts";
import { oauthTokenTypeSchema } from "./core.ts";
import type { OAuthAuthorizationDetails } from "./authorization-details.ts";
import type { OAuthTokenType } from "./core.ts";

export const oauthTokenResponseSchema = z
  .object({
    access_token: z.string(),
    token_type: oauthTokenTypeSchema,
    scope: z.string().optional(),
    refresh_token: z.string().optional(),
    expires_in: z.number().optional(),
    id_token: signedJwtSchema.optional(),
    authorization_details: oauthAuthorizationDetailsSchema.optional(),
  })
  .loose();

export type OAuthTokenResponse = z.infer<typeof oauthTokenResponseSchema>;

export type OAuthIntrospectionResponse =
  | { active: false }
  | {
    active: true;
    scope?: string;
    client_id?: string;
    username?: string;
    token_type?: OAuthTokenType;
    authorization_details?: OAuthAuthorizationDetails;
    aud?: string | [string, ...string[]];
    exp?: number;
    iat?: number;
    iss?: string;
    jti?: string;
    nbf?: number;
    sub?: string;
  };

export const oauthParResponseSchema = z.object({
  request_uri: z.string(),
  expires_in: z.number().int().positive(),
});

export type OAuthParResponse = z.infer<typeof oauthParResponseSchema>;

export const oauthAuthorizationResponseErrorSchema = z.enum([
  "invalid_request",
  "unauthorized_client",
  "access_denied",
  "unsupported_response_type",
  "invalid_scope",
  "server_error",
  "temporarily_unavailable",
]);

export type OAuthAuthorizationResponseError = z.infer<
  typeof oauthAuthorizationResponseErrorSchema
>;

