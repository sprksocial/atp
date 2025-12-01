import type { z } from "zod";
import { webUriSchema } from "./uri.ts";

export const oauthIssuerIdentifierSchema = webUriSchema.superRefine(
  (value, ctx) => {
    if (value.endsWith("/")) {
      ctx.addIssue({
        code: "custom",
        message: "Issuer URL must not end with a slash",
      });
      return;
    }

    const url = new URL(value);

    if (url.username || url.password) {
      ctx.addIssue({
        code: "custom",
        message: "Issuer URL must not contain a username or password",
      });
      return;
    }

    if (url.hash || url.search) {
      ctx.addIssue({
        code: "custom",
        message: "Issuer URL must not contain a query or fragment",
      });
      return;
    }

    const canonicalValue = url.pathname === "/" ? url.origin : url.href;
    if (value !== canonicalValue) {
      ctx.addIssue({
        code: "custom",
        message: "Issuer URL must be in the canonical form",
      });
      return;
    }
  },
);

export type OAuthIssuerIdentifier = z.infer<typeof oauthIssuerIdentifierSchema>;

