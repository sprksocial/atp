import { z } from "zod";
import { dangerousUriSchema } from "./uri.ts";

export const oauthAuthorizationDetailSchema = z.object({
  type: z.string(),
  locations: z.array(dangerousUriSchema).optional(),
  actions: z.array(z.string()).optional(),
  datatypes: z.array(z.string()).optional(),
  identifier: z.string().optional(),
  privileges: z.array(z.string()).optional(),
});

export type OAuthAuthorizationDetail = z.infer<
  typeof oauthAuthorizationDetailSchema
>;

export const oauthAuthorizationDetailsSchema = z.array(
  oauthAuthorizationDetailSchema,
);

export type OAuthAuthorizationDetails = z.infer<
  typeof oauthAuthorizationDetailsSchema
>;

