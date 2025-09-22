import { z } from "zod";
import { validateLanguage } from "@atp/common";
import { isValidNsid } from "@atp/syntax";
import { requiredPropertiesRefinement } from "./util.ts";

export const languageSchema = z
  .string()
  .refine(validateLanguage, "Invalid BCP47 language tag");

export const lexLang = z.record(languageSchema, z.string().optional());

export type LexLang = z.infer<typeof lexLang>;

// primitives
// =

export const lexBoolean = z.object({
  type: z.literal("boolean"),
  description: z.string().optional(),
  default: z.boolean().optional(),
  const: z.boolean().optional(),
});
export type LexBoolean = z.infer<typeof lexBoolean>;

export const lexInteger = z.object({
  type: z.literal("integer"),
  description: z.string().optional(),
  default: z.number().int().optional(),
  minimum: z.number().int().optional(),
  maximum: z.number().int().optional(),
  enum: z.number().int().array().optional(),
  const: z.number().int().optional(),
});
export type LexInteger = z.infer<typeof lexInteger>;

export const lexStringFormat = z.enum([
  "datetime",
  "uri",
  "at-uri",
  "did",
  "handle",
  "at-identifier",
  "nsid",
  "cid",
  "language",
  "tid",
  "record-key",
]);
export type LexStringFormat = z.infer<typeof lexStringFormat>;

export const lexString = z.object({
  type: z.literal("string"),
  format: lexStringFormat.optional(),
  description: z.string().optional(),
  default: z.string().optional(),
  minLength: z.number().int().optional(),
  maxLength: z.number().int().optional(),
  minGraphemes: z.number().int().optional(),
  maxGraphemes: z.number().int().optional(),
  enum: z.string().array().optional(),
  const: z.string().optional(),
  knownValues: z.string().array().optional(),
});
export type LexString = z.infer<typeof lexString>;

export const lexUnknown = z.object({
  type: z.literal("unknown"),
  description: z.string().optional(),
});
export type LexUnknown = z.infer<typeof lexUnknown>;

export const lexPrimitive = z.discriminatedUnion("type", [
  lexBoolean,
  lexInteger,
  lexString,
  lexUnknown,
]);
export type LexPrimitive = z.infer<typeof lexPrimitive>;

// ipld types
// =

export const lexBytes = z.object({
  type: z.literal("bytes"),
  description: z.string().optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
});
export type LexBytes = z.infer<typeof lexBytes>;

export const lexCidLink = z.object({
  type: z.literal("cid-link"),
  description: z.string().optional(),
});
export type LexCidLink = z.infer<typeof lexCidLink>;

export const lexIpldType = z.discriminatedUnion("type", [lexBytes, lexCidLink]);
export type LexIpldType = z.infer<typeof lexIpldType>;

// references
// =

export const lexRef = z.object({
  type: z.literal("ref"),
  description: z.string().optional(),
  ref: z.string(),
});
export type LexRef = z.infer<typeof lexRef>;

export const lexRefUnion = z.object({
  type: z.literal("union"),
  description: z.string().optional(),
  refs: z.string().array(),
  closed: z.boolean().optional(),
});
export type LexRefUnion = z.infer<typeof lexRefUnion>;

export const lexRefVariant = z.discriminatedUnion("type", [
  lexRef,
  lexRefUnion,
]);
export type LexRefVariant = z.infer<typeof lexRefVariant>;

// blobs
// =

export const lexBlob = z.object({
  type: z.literal("blob"),
  description: z.string().optional(),
  accept: z.string().array().optional(),
  maxSize: z.number().optional(),
});
export type LexBlob = z.infer<typeof lexBlob>;

// complex types
// =

export const lexArray = z.object({
  type: z.literal("array"),
  description: z.string().optional(),
  items: z.discriminatedUnion("type", [
    // lexPrimitive
    lexBoolean,
    lexInteger,
    lexString,
    lexUnknown,
    // lexIpldType
    lexBytes,
    lexCidLink,
    // lexRefVariant
    lexRef,
    lexRefUnion,
    // other
    lexBlob,
  ]),
  minLength: z.number().int().optional(),
  maxLength: z.number().int().optional(),
});
export type LexArray = z.infer<typeof lexArray>;

export const lexPrimitiveArray = z.object({
  ...lexArray.shape,
  items: lexPrimitive,
});

export type LexPrimitiveArray = z.infer<typeof lexPrimitiveArray>;

export const lexToken = z.object({
  type: z.literal("token"),
  description: z.string().optional(),
});
export type LexToken = z.infer<typeof lexToken>;

export const lexObject = z
  .object({
    type: z.literal("object"),
    description: z.string().optional(),
    required: z.string().array().optional(),
    nullable: z.string().array().optional(),
    properties: z.record(
      z.string(),
      z.discriminatedUnion("type", [
        lexArray,

        // lexPrimitive
        lexBoolean,
        lexInteger,
        lexString,
        lexUnknown,
        // lexIpldType
        lexBytes,
        lexCidLink,
        // lexRefVariant
        lexRef,
        lexRefUnion,
        // other
        lexBlob,
      ]),
    ),
  })
  .superRefine(requiredPropertiesRefinement);
export type LexObject = z.infer<typeof lexObject>;

// permissions
// =

const lexPermission = z.intersection(
  z.object({
    type: z.literal("permission"),
    resource: z.string().min(1),
  }),
  z.record(
    z.string(),
    z
      .union([
        z.array(z.union([z.string(), z.number().int(), z.boolean()])),

        z.boolean(),
        z.number().int(),
        z.string(),
      ])
      .optional(),
  ),
);

export type LexPermission = z.infer<typeof lexPermission>;

export const lexPermissionSet = z.object({
  type: z.literal("permission-set"),
  description: z.string().optional(),
  title: z.string().optional(),
  "title:lang": lexLang.optional(),
  detail: z.string().optional(),
  "detail:lang": lexLang.optional(),
  permissions: z.array(lexPermission),
});

export type LexPermissionSet = z.infer<typeof lexPermissionSet>;

// xrpc
// =

export const lexXrpcParameters = z
  .object({
    type: z.literal("params"),
    description: z.string().optional(),
    required: z.string().array().optional(),
    properties: z.record(
      z.string(),
      z.discriminatedUnion("type", [
        lexPrimitiveArray,

        // lexPrimitive
        lexBoolean,
        lexInteger,
        lexString,
        lexUnknown,
      ]),
    ),
  })
  .superRefine(requiredPropertiesRefinement);
export type LexXrpcParameters = z.infer<typeof lexXrpcParameters>;

export const lexXrpcBody = z.object({
  description: z.string().optional(),
  encoding: z.string(),
  // @NOTE using discriminatedUnion with a refined schema requires zod >= 4
  schema: z.union([lexRefVariant, lexObject]).optional(),
});
export type LexXrpcBody = z.infer<typeof lexXrpcBody>;

export const lexXrpcSubscriptionMessage = z.object({
  description: z.string().optional(),
  // @NOTE using discriminatedUnion with a refined schema requires zod >= 4
  schema: z.union([lexRefVariant, lexObject]).optional(),
});
export type LexXrpcSubscriptionMessage = z.infer<
  typeof lexXrpcSubscriptionMessage
>;

export const lexXrpcError = z.object({
  name: z.string(),
  description: z.string().optional(),
});
export type LexXrpcError = z.infer<typeof lexXrpcError>;

export const lexXrpcQuery = z.object({
  type: z.literal("query"),
  description: z.string().optional(),
  parameters: lexXrpcParameters.optional(),
  output: lexXrpcBody.optional(),
  errors: lexXrpcError.array().optional(),
});
export type LexXrpcQuery = z.infer<typeof lexXrpcQuery>;

export const lexXrpcProcedure = z.object({
  type: z.literal("procedure"),
  description: z.string().optional(),
  parameters: lexXrpcParameters.optional(),
  input: lexXrpcBody.optional(),
  output: lexXrpcBody.optional(),
  errors: lexXrpcError.array().optional(),
});
export type LexXrpcProcedure = z.infer<typeof lexXrpcProcedure>;

export const lexXrpcSubscription = z.object({
  type: z.literal("subscription"),
  description: z.string().optional(),
  parameters: lexXrpcParameters.optional(),
  message: lexXrpcSubscriptionMessage.optional(),
  errors: lexXrpcError.array().optional(),
});
export type LexXrpcSubscription = z.infer<typeof lexXrpcSubscription>;

// database
// =

export const lexRecord = z.object({
  type: z.literal("record"),
  description: z.string().optional(),
  key: z.string().optional(),
  record: lexObject,
});
export type LexRecord = z.infer<typeof lexRecord>;

// core
// =

// We need to use `z.custom` here because
// lexXrpcProperty and lexObject are refined
// `z.union` would work, but it's too slow
// see #915 for details
export const lexUserType = z.custom<
  | LexRecord
  | LexPermissionSet
  | LexXrpcQuery
  | LexXrpcProcedure
  | LexXrpcSubscription
  | LexBlob
  | LexArray
  | LexToken
  | LexObject
  | LexBoolean
  | LexInteger
  | LexString
  | LexBytes
  | LexCidLink
  | LexUnknown
>(
  (val) => {
    if (!val || typeof val !== "object") {
      return false;
    }

    const obj = val as Record<string, unknown>;

    if (obj["type"] === undefined) {
      return false;
    }

    try {
      switch (obj["type"]) {
        case "record":
          lexRecord.parse(val);
          return true;

        case "permission-set":
          lexPermissionSet.parse(val);
          return true;

        case "query":
          lexXrpcQuery.parse(val);
          return true;
        case "procedure":
          lexXrpcProcedure.parse(val);
          return true;
        case "subscription":
          lexXrpcSubscription.parse(val);
          return true;

        case "blob":
          lexBlob.parse(val);
          return true;

        case "array":
          lexArray.parse(val);
          return true;
        case "token":
          lexToken.parse(val);
          return true;
        case "object":
          lexObject.parse(val);
          return true;

        case "boolean":
          lexBoolean.parse(val);
          return true;
        case "integer":
          lexInteger.parse(val);
          return true;
        case "string":
          lexString.parse(val);
          return true;
        case "bytes":
          lexBytes.parse(val);
          return true;
        case "cid-link":
          lexCidLink.parse(val);
          return true;
        case "unknown":
          lexUnknown.parse(val);
          return true;

        default:
          return false;
      }
    } catch {
      return false;
    }
  },
  {
    error: (val) => {
      if (!val || typeof val !== "object") {
        return "Must be an object";
      }

      if (val["type"] === undefined) {
        return "Must have a type";
      }

      if (typeof val["type"] !== "string") {
        return "Type property must be a string";
      }

      return `Invalid type: ${
        val["type"]
      } must be one of: record, query, procedure, subscription, blob, array, token, object, boolean, integer, string, bytes, cid-link, unknown`;
    },
  },
);
export type LexUserType = z.infer<typeof lexUserType>;

export const lexiconDoc = z
  .object({
    lexicon: z.literal(1),
    id: z.string().refine(isValidNsid, {
      message: "Must be a valid NSID",
    }),
    revision: z.number().optional(),
    description: z.string().optional(),
    defs: z.record(z.string(), lexUserType),
  })
  .refine(
    (doc) => {
      for (const [defId, def] of Object.entries(doc.defs)) {
        if (
          defId !== "main" &&
          (def.type === "record" ||
            def.type === "permission-set" ||
            def.type === "procedure" ||
            def.type === "query" ||
            def.type === "subscription")
        ) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        `Records, permission sets, procedures, queries, and subscriptions must be the main definition.`,
    },
  );
export type LexiconDoc = z.infer<typeof lexiconDoc>;

// helpers
// =

export function isValidLexiconDoc(v: unknown): v is LexiconDoc {
  return lexiconDoc.safeParse(v).success;
}

export function isObj<V>(v: V): v is V & object {
  return v != null && typeof v === "object";
}

export type DiscriminatedObject = { $type: string };
export function isDiscriminatedObject(v: unknown): v is DiscriminatedObject {
  return isObj(v) && "$type" in v && typeof v.$type === "string";
}

export function parseLexiconDoc(v: unknown): LexiconDoc {
  lexiconDoc.parse(v);
  return v as LexiconDoc;
}

export type ValidationResult<V = unknown> =
  | {
    success: true;
    value: V;
  }
  | {
    success: false;
    error: ValidationError;
  };

export class ValidationError extends Error {}
export class InvalidLexiconError extends Error {}
export class LexiconDefNotFoundError extends Error {}
