import { z } from "zod";
import {
  httpsUriSchema,
  loopbackUriSchema,
  privateUseUriSchema,
} from "./uri.ts";

export const loopbackRedirectURISchema = loopbackUriSchema.superRefine(
  (value, ctx) => {
    if (value.startsWith("http://localhost")) {
      ctx.addIssue({
        code: "custom",
        message:
          'Use of "localhost" hostname is not allowed (RFC 8252), use a loopback IP such as "127.0.0.1" instead',
      });
      return;
    }
  },
);
export type LoopbackRedirectURI = z.output<typeof loopbackRedirectURISchema>;

export const oauthLoopbackClientRedirectUriSchema = loopbackRedirectURISchema;
export type OAuthLoopbackRedirectURI = z.output<
  typeof oauthLoopbackClientRedirectUriSchema
>;

export const oauthRedirectUriSchema = z.union(
  [loopbackRedirectURISchema, httpsUriSchema, privateUseUriSchema],
  {
    message:
      `URL must use the "https:" or "http:" protocol, or a private-use URI scheme (RFC 8252)`,
  },
);
export type OAuthRedirectUri = z.output<typeof oauthRedirectUriSchema>;

