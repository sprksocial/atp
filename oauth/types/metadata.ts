import { z } from "zod";
import { oauthCodeChallengeMethodSchema } from "./core.ts";
import { oauthIssuerIdentifierSchema } from "./issuer.ts";
import { webUriSchema } from "./uri.ts";

export const oauthAuthorizationServerMetadataSchema = z.object({
  issuer: oauthIssuerIdentifierSchema,
  claims_supported: z.array(z.string()).optional(),
  claims_locales_supported: z.array(z.string()).optional(),
  claims_parameter_supported: z.boolean().optional(),
  request_parameter_supported: z.boolean().optional(),
  request_uri_parameter_supported: z.boolean().optional(),
  require_request_uri_registration: z.boolean().optional(),
  scopes_supported: z.array(z.string()).optional(),
  subject_types_supported: z.array(z.string()).optional(),
  response_types_supported: z.array(z.string()).optional(),
  response_modes_supported: z.array(z.string()).optional(),
  grant_types_supported: z.array(z.string()).optional(),
  code_challenge_methods_supported: z
    .array(oauthCodeChallengeMethodSchema)
    .min(1)
    .optional(),
  ui_locales_supported: z.array(z.string()).optional(),
  id_token_signing_alg_values_supported: z.array(z.string()).optional(),
  display_values_supported: z.array(z.string()).optional(),
  request_object_signing_alg_values_supported: z.array(z.string()).optional(),
  authorization_response_iss_parameter_supported: z.boolean().optional(),
  authorization_details_types_supported: z.array(z.string()).optional(),
  request_object_encryption_alg_values_supported: z
    .array(z.string())
    .optional(),
  request_object_encryption_enc_values_supported: z
    .array(z.string())
    .optional(),
  jwks_uri: webUriSchema.optional(),
  authorization_endpoint: webUriSchema,
  token_endpoint: webUriSchema,
  token_endpoint_auth_methods_supported: z
    .array(z.string())
    .default(["client_secret_basic"]),
  token_endpoint_auth_signing_alg_values_supported: z
    .array(z.string())
    .optional(),
  revocation_endpoint: webUriSchema.optional(),
  introspection_endpoint: webUriSchema.optional(),
  pushed_authorization_request_endpoint: webUriSchema.optional(),
  require_pushed_authorization_requests: z.boolean().optional(),
  userinfo_endpoint: webUriSchema.optional(),
  end_session_endpoint: webUriSchema.optional(),
  registration_endpoint: webUriSchema.optional(),
  dpop_signing_alg_values_supported: z.array(z.string()).optional(),
  protected_resources: z.array(webUriSchema).optional(),
  client_id_metadata_document_supported: z.boolean().optional(),
});

export type OAuthAuthorizationServerMetadata = z.infer<
  typeof oauthAuthorizationServerMetadataSchema
>;

export const oauthAuthorizationServerMetadataValidator =
  oauthAuthorizationServerMetadataSchema
    .superRefine((data, ctx) => {
      if (
        data.require_pushed_authorization_requests &&
        !data.pushed_authorization_request_endpoint
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            '"pushed_authorization_request_endpoint" required when "require_pushed_authorization_requests" is true',
        });
      }
    })
    .superRefine((data, ctx) => {
      if (data.response_types_supported) {
        if (!data.response_types_supported.includes("code")) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Response type "code" is required',
          });
        }
      }
    })
    .superRefine((data, ctx) => {
      if (
        data.token_endpoint_auth_signing_alg_values_supported?.includes("none")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Client authentication method "none" is not allowed',
        });
      }
    });

export const oauthProtectedResourceMetadataSchema = z.object({
  resource: webUriSchema
    .refine((url) => !url.includes("?"), {
      message: "Resource URL must not contain query parameters",
    })
    .refine((url) => !url.includes("#"), {
      message: "Resource URL must not contain a fragment",
    }),
  authorization_servers: z.array(oauthIssuerIdentifierSchema).optional(),
  jwks_uri: webUriSchema.optional(),
  scopes_supported: z.array(z.string()).optional(),
  bearer_methods_supported: z
    .array(z.enum(["header", "body", "query"]))
    .optional(),
  resource_signing_alg_values_supported: z.array(z.string()).optional(),
  resource_documentation: webUriSchema.optional(),
  resource_policy_uri: webUriSchema.optional(),
  resource_tos_uri: webUriSchema.optional(),
});

export type OAuthProtectedResourceMetadata = z.infer<
  typeof oauthProtectedResourceMetadataSchema
>;

