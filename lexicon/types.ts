import { z } from "zod";
import { validateLanguage } from "@atp/common";
import { isValidNsid } from "@atp/syntax";
import { requiredPropertiesRefinement } from "./util.ts";

export const languageSchema: z.ZodString = z
  .string()
  .refine(validateLanguage, "Invalid BCP47 language tag");

export const lexLang: LexLangType = z.record(
  languageSchema,
  z.string().optional(),
);

type LexLangType = z.ZodRecord<z.ZodString, z.ZodOptional<z.ZodString>>;
export type LexLang = z.infer<LexLangType>;

// primitives
// =

export const lexBoolean: LexBooleanType = z.object({
  type: z.literal("boolean"),
  description: z.string().optional(),
  default: z.boolean().optional(),
  const: z.boolean().optional(),
});
type LexBooleanType = z.ZodObject<{
  type: z.ZodLiteral<"boolean">;
  description: z.ZodOptional<z.ZodString>;
  default: z.ZodOptional<z.ZodBoolean>;
  const: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type LexBoolean = z.infer<LexBooleanType>;

export const lexInteger: LexIntegerType = z.object({
  type: z.literal("integer"),
  description: z.string().optional(),
  default: z.number().int().optional(),
  minimum: z.number().int().optional(),
  maximum: z.number().int().optional(),
  enum: z.number().int().array().optional(),
  const: z.number().int().optional(),
});
type LexIntegerType = z.ZodObject<{
  type: z.ZodLiteral<"integer">;
  description: z.ZodOptional<z.ZodString>;
  default: z.ZodOptional<z.ZodNumber>;
  minimum: z.ZodOptional<z.ZodNumber>;
  maximum: z.ZodOptional<z.ZodNumber>;
  enum: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
  const: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type LexInteger = z.infer<LexIntegerType>;

export const lexStringFormat: LexStringFormatType = z.enum([
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
type LexStringFormatType = z.ZodEnum<{
  datetime: "datetime";
  uri: "uri";
  "at-uri": "at-uri";
  did: "did";
  handle: "handle";
  "at-identifier": "at-identifier";
  nsid: "nsid";
  cid: "cid";
  language: "language";
  tid: "tid";
  "record-key": "record-key";
}>;
export type LexStringFormat = z.infer<LexStringFormatType>;

export const lexString: LexStringType = z.object({
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
type LexStringType = z.ZodObject<{
  type: z.ZodLiteral<"string">;
  format: z.ZodOptional<
    z.ZodEnum<{
      datetime: "datetime";
      uri: "uri";
      "at-uri": "at-uri";
      did: "did";
      handle: "handle";
      "at-identifier": "at-identifier";
      nsid: "nsid";
      cid: "cid";
      language: "language";
      tid: "tid";
      "record-key": "record-key";
    }>
  >;
  description: z.ZodOptional<z.ZodString>;
  default: z.ZodOptional<z.ZodString>;
  minLength: z.ZodOptional<z.ZodNumber>;
  maxLength: z.ZodOptional<z.ZodNumber>;
  minGraphemes: z.ZodOptional<z.ZodNumber>;
  maxGraphemes: z.ZodOptional<z.ZodNumber>;
  enum: z.ZodOptional<z.ZodArray<z.ZodString>>;
  const: z.ZodOptional<z.ZodString>;
  knownValues: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type LexString = z.infer<LexStringType>;

export const lexUnknown: LexUnknownType = z.object({
  type: z.literal("unknown"),
  description: z.string().optional(),
});
type LexUnknownType = z.ZodObject<{
  type: z.ZodLiteral<"unknown">;
  description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type LexUnknown = z.infer<LexUnknownType>;

export const lexPrimitive: LexPrimitiveType = z.discriminatedUnion("type", [
  lexBoolean,
  lexInteger,
  lexString,
  lexUnknown,
]);
type LexPrimitiveType = z.ZodDiscriminatedUnion<
  [LexBooleanType, LexIntegerType, LexStringType, LexUnknownType],
  "type"
>;
export type LexPrimitive = z.infer<LexPrimitiveType>;

// ipld types
// =

export const lexBytes: LexBytesType = z.object({
  type: z.literal("bytes"),
  description: z.string().optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
});
type LexBytesType = z.ZodObject<{
  type: z.ZodLiteral<"bytes">;
  description: z.ZodOptional<z.ZodString>;
  maxLength: z.ZodOptional<z.ZodNumber>;
  minLength: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type LexBytes = z.infer<LexBytesType>;

export const lexCidLink: LexCidLinkType = z.object({
  type: z.literal("cid-link"),
  description: z.string().optional(),
});
type LexCidLinkType = z.ZodObject<{
  type: z.ZodLiteral<"cid-link">;
  description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type LexCidLink = z.infer<LexCidLinkType>;

export const lexIpldType: LexIpldTypeType = z.discriminatedUnion("type", [
  lexBytes,
  lexCidLink,
]);
type LexIpldTypeType = z.ZodDiscriminatedUnion<
  [LexBytesType, LexCidLinkType],
  "type"
>;
export type LexIpldType = z.infer<LexIpldTypeType>;

// references
// =

export const lexRef: LexRefType = z.object({
  type: z.literal("ref"),
  description: z.string().optional(),
  ref: z.string(),
});
type LexRefType = z.ZodObject<{
  type: z.ZodLiteral<"ref">;
  description: z.ZodOptional<z.ZodString>;
  ref: z.ZodString;
}, z.core.$strip>;
export type LexRef = z.infer<LexRefType>;

export const lexRefUnion: LexRefUnionType = z.object({
  type: z.literal("union"),
  description: z.string().optional(),
  refs: z.string().array(),
  closed: z.boolean().optional(),
});
type LexRefUnionType = z.ZodObject<{
  type: z.ZodLiteral<"union">;
  description: z.ZodOptional<z.ZodString>;
  refs: z.ZodArray<z.ZodString>;
  closed: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type LexRefUnion = z.infer<LexRefUnionType>;

export const lexRefVariant: LexRefVariantType = z.discriminatedUnion("type", [
  lexRef,
  lexRefUnion,
]);
type LexRefVariantType = z.ZodDiscriminatedUnion<
  [LexRefType, LexRefUnionType],
  "type"
>;
export type LexRefVariant = z.infer<LexRefVariantType>;

// blobs
// =

export const lexBlob: LexBlobType = z.object({
  type: z.literal("blob"),
  description: z.string().optional(),
  accept: z.string().array().optional(),
  maxSize: z.number().optional(),
});
type LexBlobType = z.ZodObject<{
  type: z.ZodLiteral<"blob">;
  description: z.ZodOptional<z.ZodString>;
  accept: z.ZodOptional<z.ZodArray<z.ZodString>>;
  maxSize: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type LexBlob = z.infer<LexBlobType>;

// complex types
// =

export const lexArray: LexArrayType = z.object({
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
type LexArrayType = z.ZodObject<{
  type: z.ZodLiteral<"array">;
  description: z.ZodOptional<z.ZodString>;
  items: z.ZodDiscriminatedUnion<
    [
      LexBooleanType,
      LexIntegerType,
      LexStringType,
      LexUnknownType,
      LexBytesType,
      LexCidLinkType,
      LexRefType,
      LexRefUnionType,
      LexBlobType,
    ],
    "type"
  >;
  minLength: z.ZodOptional<z.ZodNumber>;
  maxLength: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type LexArray = z.infer<LexArrayType>;

export const lexPrimitiveArray: LexPrimitiveArrayType = z.object({
  ...lexArray.shape,
  items: lexPrimitive,
});
type LexPrimitiveArrayType = z.ZodObject<{
  items: LexPrimitiveType;
  type: z.ZodLiteral<"array">;
  description: z.ZodOptional<z.ZodString>;
  minLength: z.ZodOptional<z.ZodNumber>;
  maxLength: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type LexPrimitiveArray = z.infer<LexPrimitiveArrayType>;

export const lexToken: LexTokenType = z.object({
  type: z.literal("token"),
  description: z.string().optional(),
});
type LexTokenType = z.ZodObject<{
  type: z.ZodLiteral<"token">;
  description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type LexToken = z.infer<LexTokenType>;

export const lexObject: LexObjectType = z
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
type LexObjectType = z.ZodObject<{
  type: z.ZodLiteral<"object">;
  description: z.ZodOptional<z.ZodString>;
  required: z.ZodOptional<z.ZodArray<z.ZodString>>;
  nullable: z.ZodOptional<z.ZodArray<z.ZodString>>;
  properties: z.ZodRecord<
    z.ZodString,
    z.ZodDiscriminatedUnion<
      [
        LexArrayType,
        LexBooleanType,
        LexIntegerType,
        LexStringType,
        LexUnknownType,
        LexBytesType,
        LexCidLinkType,
        LexRefType,
        LexRefUnionType,
        LexBlobType,
      ],
      "type"
    >
  >;
}, z.core.$strip>;
export type LexObject = z.infer<LexObjectType>;

// permissions
// =

const lexPermission: LexPermissionType = z.intersection(
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
type LexPermissionType = z.ZodIntersection<
  z.ZodObject<{
    type: z.ZodLiteral<"permission">;
    resource: z.ZodString;
  }, z.core.$strip>,
  z.ZodRecord<
    z.ZodString,
    z.ZodOptional<
      z.ZodUnion<
        readonly [
          z.ZodArray<
            z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>
          >,
          z.ZodBoolean,
          z.ZodNumber,
          z.ZodString,
        ]
      >
    >
  >
>;
export type LexPermission = z.infer<LexPermissionType>;

export const lexPermissionSet: LexPermissionSetType = z.object({
  type: z.literal("permission-set"),
  description: z.string().optional(),
  title: z.string().optional(),
  "title:lang": lexLang.optional(),
  detail: z.string().optional(),
  "detail:lang": lexLang.optional(),
  permissions: z.array(lexPermission),
});
type LexPermissionSetType = z.ZodObject<{
  type: z.ZodLiteral<"permission-set">;
  description: z.ZodOptional<z.ZodString>;
  title: z.ZodOptional<z.ZodString>;
  "title:lang": z.ZodOptional<LexLangType>;
  detail: z.ZodOptional<z.ZodString>;
  "detail:lang": z.ZodOptional<LexLangType>;
  permissions: z.ZodArray<LexPermissionType>;
}, z.core.$strip>;
export type LexPermissionSet = z.infer<LexPermissionSetType>;

// xrpc
// =

export const lexXrpcParameters: LexXrpcParametersType = z
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
type LexXrpcParametersType = z.ZodObject<{
  type: z.ZodLiteral<"params">;
  description: z.ZodOptional<z.ZodString>;
  required: z.ZodOptional<z.ZodArray<z.ZodString>>;
  properties: z.ZodRecord<
    z.ZodString,
    z.ZodDiscriminatedUnion<
      [
        LexPrimitiveArrayType,
        LexBooleanType,
        LexIntegerType,
        LexStringType,
        LexUnknownType,
      ],
      "type"
    >
  >;
}, z.core.$strip>;
export type LexXrpcParameters = z.infer<LexXrpcParametersType>;

export const lexXrpcBody: LexXrpcBodyType = z.object({
  description: z.string().optional(),
  encoding: z.string(),
  // @NOTE using discriminatedUnion with a refined schema requires zod >= 4
  schema: z.union([lexRefVariant, lexObject]).optional(),
});
type LexXrpcBodyType = z.ZodObject<{
  description: z.ZodOptional<z.ZodString>;
  encoding: z.ZodString;
  schema: z.ZodOptional<
    z.ZodUnion<readonly [LexRefVariantType, LexObjectType]>
  >;
}, z.core.$strip>;
export type LexXrpcBody = z.infer<LexXrpcBodyType>;

export const lexXrpcSubscriptionMessage: LexXrpcSubscriptionMessageType = z
  .object({
    description: z.string().optional(),
    // @NOTE using discriminatedUnion with a refined schema requires zod >= 4
    schema: z.union([lexRefVariant, lexObject]).optional(),
  });
type LexXrpcSubscriptionMessageType = z.ZodObject<{
  description: z.ZodOptional<z.ZodString>;
  schema: z.ZodOptional<
    z.ZodUnion<readonly [LexRefVariantType, LexObjectType]>
  >;
}, z.core.$strip>;
export type LexXrpcSubscriptionMessage = z.infer<
  LexXrpcSubscriptionMessageType
>;

export const lexXrpcError: LexXrpcErrorType = z.object({
  name: z.string(),
  description: z.string().optional(),
});
type LexXrpcErrorType = z.ZodObject<{
  name: z.ZodString;
  description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type LexXrpcError = z.infer<LexXrpcErrorType>;

export const lexXrpcQuery: LexXrpcQueryType = z.object({
  type: z.literal("query"),
  description: z.string().optional(),
  parameters: lexXrpcParameters.optional(),
  output: lexXrpcBody.optional(),
  errors: lexXrpcError.array().optional(),
});
type LexXrpcQueryType = z.ZodObject<{
  type: z.ZodLiteral<"query">;
  description: z.ZodOptional<z.ZodString>;
  parameters: z.ZodOptional<LexXrpcParametersType>;
  output: z.ZodOptional<LexXrpcBodyType>;
  errors: z.ZodOptional<z.ZodArray<LexXrpcErrorType>>;
}, z.core.$strip>;
export type LexXrpcQuery = z.infer<LexXrpcQueryType>;

export const lexXrpcProcedure: LexXrpcProcedureType = z.object({
  type: z.literal("procedure"),
  description: z.string().optional(),
  parameters: lexXrpcParameters.optional(),
  input: lexXrpcBody.optional(),
  output: lexXrpcBody.optional(),
  errors: lexXrpcError.array().optional(),
});
type LexXrpcProcedureType = z.ZodObject<{
  type: z.ZodLiteral<"procedure">;
  description: z.ZodOptional<z.ZodString>;
  parameters: z.ZodOptional<LexXrpcParametersType>;
  input: z.ZodOptional<LexXrpcBodyType>;
  output: z.ZodOptional<LexXrpcBodyType>;
  errors: z.ZodOptional<z.ZodArray<LexXrpcErrorType>>;
}, z.core.$strip>;
export type LexXrpcProcedure = z.infer<LexXrpcProcedureType>;

export const lexXrpcSubscription: LexXrpcSubscriptionType = z.object({
  type: z.literal("subscription"),
  description: z.string().optional(),
  parameters: lexXrpcParameters.optional(),
  message: lexXrpcSubscriptionMessage.optional(),
  errors: lexXrpcError.array().optional(),
});
type LexXrpcSubscriptionType = z.ZodObject<{
  type: z.ZodLiteral<"subscription">;
  description: z.ZodOptional<z.ZodString>;
  parameters: z.ZodOptional<LexXrpcParametersType>;
  message: z.ZodOptional<LexXrpcSubscriptionMessageType>;
  errors: z.ZodOptional<z.ZodArray<LexXrpcErrorType>>;
}, z.core.$strip>;
export type LexXrpcSubscription = z.infer<LexXrpcSubscriptionType>;

// database
// =

export const lexRecord: LexRecordType = z.object({
  type: z.literal("record"),
  description: z.string().optional(),
  key: z.string().optional(),
  record: lexObject,
});
type LexRecordType = z.ZodObject<{
  type: z.ZodLiteral<"record">;
  description: z.ZodOptional<z.ZodString>;
  key: z.ZodOptional<z.ZodString>;
  record: LexObjectType;
}, z.core.$strip>;
export type LexRecord = z.infer<LexRecordType>;

// core
// =

// We need to use `z.custom` here because
// lexXrpcProperty and lexObject are refined
// `z.union` would work, but it's too slow
// see #915 for details
export const lexUserType: LexUserTypeType = z.custom<
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
type LexUserTypeType = z.ZodCustom<
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
>;
export type LexUserType = z.infer<LexUserTypeType>;

export const lexiconDoc: LexiconDocType = z
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
type LexiconDocType = z.ZodObject<{
  lexicon: z.ZodLiteral<1>;
  id: z.ZodString;
  revision: z.ZodOptional<z.ZodNumber>;
  description: z.ZodOptional<z.ZodString>;
  defs: z.ZodRecord<z.ZodString, LexUserTypeType>;
}, z.core.$strip>;
export type LexiconDoc = z.infer<LexiconDocType>;

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
