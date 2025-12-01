import { z } from "zod";

export const oauthTokenTypeSchema = z.union([
  z
    .string()
    .regex(/^DPoP$/i)
    .transform(() => "DPoP" as const),
  z
    .string()
    .regex(/^Bearer$/i)
    .transform(() => "Bearer" as const),
]);

export type OAuthTokenType = z.infer<typeof oauthTokenTypeSchema>;

export const oauthGrantTypeSchema = z.enum([
  "authorization_code",
  "implicit",
  "refresh_token",
  "password",
  "client_credentials",
  "urn:ietf:params:oauth:grant-type:jwt-bearer",
  "urn:ietf:params:oauth:grant-type:saml2-bearer",
]);

export type OAuthGrantType = z.infer<typeof oauthGrantTypeSchema>;

export const oauthCodeChallengeMethodSchema = z.enum(["S256", "plain"]);

export const oauthResponseTypeSchema = z.enum([
  "code",
  "token",
  "none",
  "code id_token token",
  "code id_token",
  "code token",
  "id_token token",
  "id_token",
]);

export type OAuthResponseType = z.infer<typeof oauthResponseTypeSchema>;

export const oauthResponseModeSchema = z.enum([
  "query",
  "fragment",
  "form_post",
]);

export type OAuthResponseMode = z.infer<typeof oauthResponseModeSchema>;

export const OAUTH_ENDPOINT_NAMES = [
  "token",
  "revocation",
  "introspection",
  "pushed_authorization_request",
] as const;

export type OAuthEndpointName = (typeof OAUTH_ENDPOINT_NAMES)[number];

export const oauthEndpointAuthMethod = z.enum([
  "client_secret_basic",
  "client_secret_jwt",
  "client_secret_post",
  "none",
  "private_key_jwt",
  "self_signed_tls_client_auth",
  "tls_client_auth",
]);

export type OauthEndpointAuthMethod = z.infer<typeof oauthEndpointAuthMethod>;

export const OAUTH_SCOPE_REGEXP =
  /^[\x21\x23-\x5B\x5D-\x7E]+(?: [\x21\x23-\x5B\x5D-\x7E]+)*$/;

export const isOAuthScope = (input: string): boolean =>
  OAUTH_SCOPE_REGEXP.test(input);

export const oauthScopeSchema = z.string().refine(isOAuthScope, {
  message: "Invalid OAuth scope",
});

export type OAuthScope = z.infer<typeof oauthScopeSchema>;

export const oauthClientIdSchema = z.string().min(1);
export type OAuthClientId = z.infer<typeof oauthClientIdSchema>;

export const oauthAccessTokenSchema = z.string().min(1);
export type OAuthAccessToken = z.infer<typeof oauthAccessTokenSchema>;

export const oauthRefreshTokenSchema = z.string().min(1);
export type OAuthRefreshToken = z.infer<typeof oauthRefreshTokenSchema>;

export const oauthRequestUriSchema = z.string();
export type OAuthRequestUri = z.infer<typeof oauthRequestUriSchema>;

