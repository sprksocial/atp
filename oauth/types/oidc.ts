import { z } from "zod";

export const oidcUserinfoSchema = z.object({
  sub: z.string(),
  iss: z.url().optional(),
  aud: z.union([z.string(), z.array(z.string()).min(1)]).optional(),
  email: z.email().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  preferred_username: z.string().optional(),
  picture: z.url().optional(),
});

export type OidcUserinfo = z.infer<typeof oidcUserinfoSchema>;

export const oidcClaimsParameterSchema = z.enum([
  "auth_time",
  "nonce",
  "acr",
  "name",
  "family_name",
  "given_name",
  "middle_name",
  "nickname",
  "preferred_username",
  "gender",
  "picture",
  "profile",
  "website",
  "birthdate",
  "zoneinfo",
  "locale",
  "updated_at",
  "email",
  "email_verified",
  "phone_number",
  "phone_number_verified",
  "address",
]);

export type OidcClaimsParameter = z.infer<typeof oidcClaimsParameterSchema>;

const oidcClaimsValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const oidcClaimsPropertiesSchema = z.object({
  essential: z.boolean().optional(),
  value: oidcClaimsValueSchema.optional(),
  values: z.array(oidcClaimsValueSchema).optional(),
});

export type OidcClaimsProperties = z.infer<typeof oidcClaimsPropertiesSchema>;

export const oidcEntityTypeSchema = z.enum(["userinfo", "id_token"]);

export type OidcEntityType = z.infer<typeof oidcEntityTypeSchema>;

export const oidcAuthorizationResponseErrorSchema = z.enum([
  "interaction_required",
  "login_required",
  "account_selection_required",
  "consent_required",
  "invalid_request_uri",
  "invalid_request_object",
  "request_not_supported",
  "request_uri_not_supported",
  "registration_not_supported",
]);

export type OidcAuthorizationResponseError = z.infer<
  typeof oidcAuthorizationResponseErrorSchema
>;

