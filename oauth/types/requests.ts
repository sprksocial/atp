import { z } from "zod";
import { signedJwtSchema, unsignedJwtSchema } from "@atp/jwk";
import { oauthRedirectUriSchema } from "./redirect-uri.ts";
import { oauthRefreshTokenSchema, oauthAccessTokenSchema } from "./core.ts";
import { oauthClientIdSchema } from "./core.ts";
import { oauthCodeChallengeMethodSchema } from "./core.ts";
import { oauthResponseModeSchema } from "./core.ts";
import { oauthResponseTypeSchema } from "./core.ts";
import { oauthScopeSchema } from "./core.ts";
import { oauthRequestUriSchema } from "./core.ts";
import { oidcClaimsParameterSchema } from "./oidc.ts";
import { oidcClaimsPropertiesSchema } from "./oidc.ts";
import { oidcEntityTypeSchema } from "./oidc.ts";
import { jsonObjectPreprocess, numberPreprocess } from "./util.ts";
import { oauthAuthorizationDetailsSchema } from "./authorization-details.ts";

export const oauthAuthorizationCodeGrantTokenRequestSchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(1),
  redirect_uri: oauthRedirectUriSchema,
  code_verifier: z
    .string()
    .min(43)
    .max(128)
    .regex(/^[a-zA-Z0-9-._~]+$/)
    .optional(),
});

export type OAuthAuthorizationCodeGrantTokenRequest = z.infer<
  typeof oauthAuthorizationCodeGrantTokenRequestSchema
>;

export const oauthClientCredentialsGrantTokenRequestSchema = z.object({
  grant_type: z.literal("client_credentials"),
});

export type OAuthClientCredentialsGrantTokenRequest = z.infer<
  typeof oauthClientCredentialsGrantTokenRequestSchema
>;

export const oauthPasswordGrantTokenRequestSchema = z.object({
  grant_type: z.literal("password"),
  username: z.string(),
  password: z.string(),
});

export type OAuthPasswordGrantTokenRequest = z.infer<
  typeof oauthPasswordGrantTokenRequestSchema
>;

export const oauthRefreshTokenGrantTokenRequestSchema = z.object({
  grant_type: z.literal("refresh_token"),
  refresh_token: oauthRefreshTokenSchema,
});

export type OAuthRefreshTokenGrantTokenRequest = z.infer<
  typeof oauthRefreshTokenGrantTokenRequestSchema
>;

export const oauthTokenRequestSchema = z.discriminatedUnion("grant_type", [
  oauthAuthorizationCodeGrantTokenRequestSchema,
  oauthRefreshTokenGrantTokenRequestSchema,
  oauthPasswordGrantTokenRequestSchema,
  oauthClientCredentialsGrantTokenRequestSchema,
]);

export type OAuthTokenRequest = z.infer<typeof oauthTokenRequestSchema>;

export const oauthAuthorizationRequestParametersSchema = z.object({
  client_id: oauthClientIdSchema,
  state: z.string().optional(),
  redirect_uri: oauthRedirectUriSchema.optional(),
  scope: oauthScopeSchema.optional(),
  response_type: oauthResponseTypeSchema,
  code_challenge: z.string().optional(),
  code_challenge_method: oauthCodeChallengeMethodSchema.optional(),
  dpop_jkt: z.string().optional(),
  response_mode: oauthResponseModeSchema.optional(),
  nonce: z.string().optional(),
  max_age: z.preprocess(numberPreprocess, z.number().int().min(0)).optional(),
  claims: z
    .preprocess(
      jsonObjectPreprocess,
      z.record(
        oidcEntityTypeSchema,
        z.record(
          oidcClaimsParameterSchema,
          z.union([z.literal(null), oidcClaimsPropertiesSchema]),
        ),
      ),
    )
    .optional(),
  login_hint: z.string().min(1).optional(),
  ui_locales: z
    .string()
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?( [a-z]{2,3}(-[A-Z]{2})?)*$/)
    .optional(),
  id_token_hint: signedJwtSchema.optional(),
  display: z.enum(["page", "popup", "touch", "wap"]).optional(),
  prompt: z.enum(["none", "login", "consent", "select_account"]).optional(),
  authorization_details: z
    .preprocess(jsonObjectPreprocess, oauthAuthorizationDetailsSchema)
    .optional(),
});

export type OAuthAuthorizationRequestParameters = z.infer<
  typeof oauthAuthorizationRequestParametersSchema
>;

export const oauthAuthorizationRequestJarSchema = z.object({
  request: z.union([signedJwtSchema, unsignedJwtSchema]),
});

export type OAuthAuthorizationRequestJar = z.infer<
  typeof oauthAuthorizationRequestJarSchema
>;

export const oauthAuthorizationRequestUriSchema = z.object({
  request_uri: oauthRequestUriSchema,
});

export type OAuthAuthorizationRequestUri = z.infer<
  typeof oauthAuthorizationRequestUriSchema
>;

export const oauthAuthorizationRequestParSchema = z.union([
  oauthAuthorizationRequestParametersSchema,
  oauthAuthorizationRequestJarSchema,
]);

export type OAuthAuthorizationRequestPar = z.infer<
  typeof oauthAuthorizationRequestParSchema
>;

export const oauthAuthorizationRequestQuerySchema = z.union([
  oauthAuthorizationRequestParametersSchema,
  oauthAuthorizationRequestJarSchema,
  oauthAuthorizationRequestUriSchema,
]);

export type OAuthAuthorizationRequestQuery = z.infer<
  typeof oauthAuthorizationRequestQuerySchema
>;

export const oauthTokenIdentificationSchema = z.object({
  token: z.union([oauthAccessTokenSchema, oauthRefreshTokenSchema]),
  token_type_hint: z.enum(["access_token", "refresh_token"]).optional(),
});

export type OAuthTokenIdentification = z.infer<
  typeof oauthTokenIdentificationSchema
>;

