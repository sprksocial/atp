import * as l from "../external.ts";

const bool: l.BooleanSchema = l.boolean();
const int: l.IntegerSchema = l.integer();
const str: l.StringSchema<NonNullable<unknown>> = l.string();

const boolOpt: l.OptionalSchema<boolean> = l.optional(bool);
const intOpt: l.OptionalSchema<number> = l.optional(int);
const strOpt: l.OptionalSchema<string> = l.optional(str);

const strArrOpt: l.OptionalSchema<string[]> = l.optional(l.array(str));

export const lexiconBooleanSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"boolean">;
  default: typeof boolOpt;
  const: typeof boolOpt;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("boolean"),
  default: boolOpt,
  const: boolOpt,
  description: strOpt,
});
export type LexiconBoolean = l.Infer<typeof lexiconBooleanSchema>;

export const lexiconIntegerSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"integer">;
  default: typeof intOpt;
  minimum: typeof intOpt;
  maximum: typeof intOpt;
  enum: l.OptionalSchema<l.Infer<typeof int>[]>;
  const: typeof intOpt;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("integer"),
  default: intOpt,
  minimum: intOpt,
  maximum: intOpt,
  enum: l.optional(l.array(int)),
  const: intOpt,
  description: strOpt,
});
export type LexiconInteger = l.Infer<typeof lexiconIntegerSchema>;

export const lexiconStringSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"string">;
  format: l.OptionalSchema<l.StringFormat>;
  default: typeof strOpt;
  minLength: typeof intOpt;
  maxLength: typeof intOpt;
  minGraphemes: typeof intOpt;
  maxGraphemes: typeof intOpt;
  enum: typeof strArrOpt;
  const: typeof strOpt;
  knownValues: typeof strArrOpt;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("string"),
  format: l.optional(l.enum<l.StringFormat>(l.STRING_FORMATS)),
  default: strOpt,
  minLength: intOpt,
  maxLength: intOpt,
  minGraphemes: intOpt,
  maxGraphemes: intOpt,
  enum: strArrOpt,
  const: strOpt,
  knownValues: strArrOpt,
  description: strOpt,
});
export type LexiconString = l.Infer<typeof lexiconStringSchema>;

export const lexiconBytesSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"bytes">;
  maxLength: typeof intOpt;
  minLength: typeof intOpt;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("bytes"),
  maxLength: intOpt,
  minLength: intOpt,
  description: strOpt,
});
export type LexiconBytes = l.Infer<typeof lexiconBytesSchema>;

export const lexiconCidLinkSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"cid-link">;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("cid-link"),
  description: strOpt,
});
export type LexiconCid = l.Infer<typeof lexiconCidLinkSchema>;

export const lexiconBlobSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"blob">;
  accept: typeof strArrOpt;
  maxSize: typeof intOpt;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("blob"),
  accept: strArrOpt,
  maxSize: intOpt,
  description: strOpt,
});
export type LexiconBlob = l.Infer<typeof lexiconBlobSchema>;

const CONCRETE_TYPES = [
  lexiconBooleanSchema,
  lexiconIntegerSchema,
  lexiconStringSchema,
  lexiconBytesSchema,
  lexiconCidLinkSchema,
  lexiconBlobSchema,
] as const;

export const lexiconUnknownSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"unknown">;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("unknown"),
  description: strOpt,
});
export type LexiconUnknown = l.Infer<typeof lexiconUnknownSchema>;

export const lexiconTokenSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"token">;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("token"),
  description: strOpt,
});
export type LexiconToken = l.Infer<typeof lexiconTokenSchema>;

export const lexiconRefSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"ref">;
  ref: typeof str;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("ref"),
  ref: str,
  description: strOpt,
});
export type LexiconRef = l.Infer<typeof lexiconRefSchema>;

export const lexiconRefUnionSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"union">;
  refs: l.ArraySchema<typeof str>;
  closed: typeof boolOpt;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("union"),
  refs: l.array(str),
  closed: boolOpt,
  description: strOpt,
});
export type LexiconRefUnion = l.Infer<typeof lexiconRefUnionSchema>;

const ARRAY_ITEMS_SCHEMAS = [
  ...CONCRETE_TYPES,
  lexiconUnknownSchema,
  lexiconRefSchema,
  lexiconRefUnionSchema,
] as const;

export type LexiconArrayItems = l.Infer<(typeof ARRAY_ITEMS_SCHEMAS)[number]>;

export const lexiconArraySchema: l.ObjectSchema<{
  type: l.LiteralSchema<"array">;
  items: l.DiscriminatedUnionSchema<"type", typeof ARRAY_ITEMS_SCHEMAS>;
  minLength: typeof intOpt;
  maxLength: typeof intOpt;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("array"),
  items: l.discriminatedUnion("type", ARRAY_ITEMS_SCHEMAS),
  minLength: intOpt,
  maxLength: intOpt,
  description: strOpt,
});
export type LexiconArray = l.Infer<typeof lexiconArraySchema>;

const requirePropertiesRefinement: l.RefinementCheck<{
  required?: string[];
  properties: Record<string, unknown>;
}> = {
  check: (
    value: { required?: string[]; properties: Record<string, unknown> },
  ) =>
    !value.required ||
    value.required.every((key: string) => key in value.properties),
  message: "All required parameters must be defined in properties",
  path: "required",
};

export const lexiconObjectSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"object">;
  properties: l.DictSchema<
    typeof str,
    l.DiscriminatedUnionSchema<
      "type",
      readonly [...typeof ARRAY_ITEMS_SCHEMAS, typeof lexiconArraySchema]
    >
  >;
  required: typeof strArrOpt;
  nullable: typeof strArrOpt;
  description: typeof strOpt;
}> = l.refine(
  l.object({
    type: l.literal("object"),
    properties: l.dict(
      str,
      l.discriminatedUnion("type", [
        ...ARRAY_ITEMS_SCHEMAS,
        lexiconArraySchema,
      ]),
    ),
    required: strArrOpt,
    nullable: strArrOpt,
    description: strOpt,
  }),
  requirePropertiesRefinement,
);
export type LexiconObject = l.Infer<typeof lexiconObjectSchema>;

export const lexiconRecordKeySchema: l.CustomSchema<l.LexiconRecordKey> = l
  .custom(
    l.isLexiconRecordKey,
    'Invalid record key definition (must be "any", "nsid", "tid", or "literal:<string>")',
  );
export type LexiconRecordKey = l.LexiconRecordKey;

export const lexiconRecordSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"record">;
  record: typeof lexiconObjectSchema;
  description: typeof strOpt;
  key: typeof lexiconRecordKeySchema;
}> = l.object({
  type: l.literal("record"),
  record: lexiconObjectSchema,
  description: strOpt,
  key: lexiconRecordKeySchema,
});
export type LexiconRecord = l.Infer<typeof lexiconRecordSchema>;

export const lexiconParameters: l.ObjectSchema<{
  type: l.LiteralSchema<"params">;
  properties: l.DictSchema<
    typeof str,
    l.DiscriminatedUnionSchema<
      "type",
      readonly [
        typeof lexiconBooleanSchema,
        typeof lexiconIntegerSchema,
        typeof lexiconStringSchema,
        l.ObjectSchema<{
          type: l.LiteralSchema<"array">;
          items: l.DiscriminatedUnionSchema<
            "type",
            readonly [
              typeof lexiconBooleanSchema,
              typeof lexiconIntegerSchema,
              typeof lexiconStringSchema,
            ]
          >;
          minLength: typeof intOpt;
          maxLength: typeof intOpt;
          description: typeof strOpt;
        }>,
      ]
    >
  >;
  required: typeof strArrOpt;
  description: typeof strOpt;
}> = l.refine(
  l.object({
    type: l.literal("params"),
    properties: l.dict(
      str,
      l.discriminatedUnion("type", [
        lexiconBooleanSchema,
        lexiconIntegerSchema,
        lexiconStringSchema,
        l.object({
          type: l.literal("array"),
          items: l.discriminatedUnion("type", [
            lexiconBooleanSchema,
            lexiconIntegerSchema,
            lexiconStringSchema,
          ]),
          minLength: intOpt,
          maxLength: intOpt,
          description: strOpt,
        }),
      ]),
    ),
    required: strArrOpt,
    description: strOpt,
  }),
  requirePropertiesRefinement,
);
export type LexiconParameters = l.Infer<typeof lexiconParameters>;

export const lexiconPayload: l.ObjectSchema<{
  encoding: typeof str;
  schema: l.OptionalSchema<
    l.Infer<
      l.DiscriminatedUnionSchema<
        "type",
        readonly [
          typeof lexiconRefSchema,
          typeof lexiconRefUnionSchema,
          typeof lexiconObjectSchema,
        ]
      >
    >
  >;
  description: typeof strOpt;
}> = l.object({
  encoding: str,
  schema: l.optional(
    l.discriminatedUnion("type", [
      lexiconRefSchema,
      lexiconRefUnionSchema,
      lexiconObjectSchema,
    ]),
  ),
  description: strOpt,
});
export type LexiconPayload = l.Infer<typeof lexiconPayload>;

export const lexiconSubscriptionMessage: l.ObjectSchema<{
  description: typeof strOpt;
  schema: l.OptionalSchema<
    l.Infer<
      l.DiscriminatedUnionSchema<
        "type",
        readonly [
          typeof lexiconRefSchema,
          typeof lexiconRefUnionSchema,
          typeof lexiconObjectSchema,
        ]
      >
    >
  >;
}> = l.object({
  description: strOpt,
  schema: l.optional(
    l.discriminatedUnion("type", [
      lexiconRefSchema,
      lexiconRefUnionSchema,
      lexiconObjectSchema,
    ]),
  ),
});
export type LexiconSubscriptionMessage = l.Infer<
  typeof lexiconSubscriptionMessage
>;

export const lexiconError: l.ObjectSchema<{
  name: l.StringSchema<{ minLength: 1 }>;
  description: typeof strOpt;
}> = l.object({
  name: l.string({ minLength: 1 }),
  description: strOpt,
});
export type LexiconError = l.Infer<typeof lexiconError>;

export const lexiconQuerySchema: l.ObjectSchema<{
  type: l.LiteralSchema<"query">;
  parameters: l.OptionalSchema<l.Infer<typeof lexiconParameters>>;
  output: l.OptionalSchema<l.Infer<typeof lexiconPayload>>;
  errors: l.OptionalSchema<l.Infer<typeof lexiconError>[]>;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("query"),
  parameters: l.optional(lexiconParameters),
  output: l.optional(lexiconPayload),
  errors: l.optional(l.array(lexiconError)),
  description: strOpt,
});
export type LexiconQuery = l.Infer<typeof lexiconQuerySchema>;

export const lexiconProcedureSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"procedure">;
  parameters: l.OptionalSchema<l.Infer<typeof lexiconParameters>>;
  input: l.OptionalSchema<l.Infer<typeof lexiconPayload>>;
  output: l.OptionalSchema<l.Infer<typeof lexiconPayload>>;
  errors: l.OptionalSchema<l.Infer<typeof lexiconError>[]>;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("procedure"),
  parameters: l.optional(lexiconParameters),
  input: l.optional(lexiconPayload),
  output: l.optional(lexiconPayload),
  errors: l.optional(l.array(lexiconError)),
  description: strOpt,
});
export type LexiconProcedure = l.Infer<typeof lexiconProcedureSchema>;

export const lexiconSubscriptionSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"subscription">;
  description: typeof strOpt;
  parameters: l.OptionalSchema<l.Infer<typeof lexiconParameters>>;
  message: l.OptionalSchema<l.Infer<typeof lexiconSubscriptionMessage>>;
  errors: l.OptionalSchema<l.Infer<typeof lexiconError>[]>;
}> = l.object({
  type: l.literal("subscription"),
  description: strOpt,
  parameters: l.optional(lexiconParameters),
  message: l.optional(lexiconSubscriptionMessage),
  errors: l.optional(l.array(lexiconError)),
});
export type LexiconSubscription = l.Infer<typeof lexiconSubscriptionSchema>;

const lexiconLanguageSchema: l.StringSchema<{ format: "language" }> = l.string({
  format: "language",
});
export type LexiconLanguage = l.Infer<typeof lexiconLanguageSchema>;

const lexiconLanguageDict: l.DictSchema<
  typeof lexiconLanguageSchema,
  typeof str
> = l.dict(lexiconLanguageSchema, str);
export type LexiconLanguageDict = l.Infer<typeof lexiconLanguageDict>;

const lexiconPermissionSchema: l.IntersectionSchema<
  l.ObjectSchema<{
    type: l.LiteralSchema<"permission">;
    resource: l.StringSchema<{ minLength: 1 }>;
  }>,
  l.DictSchema<l.StringSchema<NonNullable<unknown>>, l.UnknownSchema>
> = l.intersection(
  l.object({
    type: l.literal("permission"),
    resource: l.string({ minLength: 1 }),
  }),
  l.dict(l.string(), l.unknown()),
);
export type LexiconPermission = l.Infer<typeof lexiconPermissionSchema>;

const lexiconPermissionSetSchema: l.ObjectSchema<{
  type: l.LiteralSchema<"permission-set">;
  permissions: l.ArraySchema<typeof lexiconPermissionSchema>;
  title: typeof strOpt;
  "title:lang": l.OptionalSchema<l.Infer<typeof lexiconLanguageDict>>;
  detail: typeof strOpt;
  "detail:lang": l.OptionalSchema<l.Infer<typeof lexiconLanguageDict>>;
  description: typeof strOpt;
}> = l.object({
  type: l.literal("permission-set"),
  permissions: l.array(lexiconPermissionSchema),
  title: strOpt,
  "title:lang": l.optional(lexiconLanguageDict),
  detail: strOpt,
  "detail:lang": l.optional(lexiconLanguageDict),
  description: strOpt,
});
export type LexiconPermissionSet = l.Infer<typeof lexiconPermissionSetSchema>;

const NAMED_LEXICON_SCHEMAS = [
  ...CONCRETE_TYPES,
  lexiconArraySchema,
  lexiconObjectSchema,
  lexiconTokenSchema,
] as const;

export type NamedLexiconDefinition = l.Infer<
  (typeof NAMED_LEXICON_SCHEMAS)[number]
>;

const MAIN_LEXICON_SCHEMAS = [
  lexiconPermissionSetSchema,
  lexiconProcedureSchema,
  lexiconQuerySchema,
  lexiconRecordSchema,
  lexiconSubscriptionSchema,
  ...NAMED_LEXICON_SCHEMAS,
] as const;

export type MainLexiconDefinition = l.Infer<
  (typeof MAIN_LEXICON_SCHEMAS)[number]
>;

export const lexiconIdentifierSchema: l.StringSchema<{ format: "nsid" }> = l
  .string({ format: "nsid" });
export type LexiconIdentifier = l.Infer<typeof lexiconIdentifierSchema>;

export const lexiconDocumentSchema: l.ObjectSchema<{
  lexicon: l.LiteralSchema<1>;
  id: typeof lexiconIdentifierSchema;
  revision: typeof intOpt;
  description: typeof strOpt;
  defs: l.IntersectionSchema<
    l.ObjectSchema<{
      main: l.OptionalSchema<MainLexiconDefinition>;
    }>,
    l.DictSchema<
      l.StringSchema<{ minLength: 1 }>,
      l.DiscriminatedUnionSchema<"type", typeof NAMED_LEXICON_SCHEMAS>
    >
  >;
}> = l.object({
  lexicon: l.literal(1),
  id: lexiconIdentifierSchema,
  revision: intOpt,
  description: strOpt,
  defs: l.intersection(
    l.object({
      main: l.optional(l.discriminatedUnion("type", MAIN_LEXICON_SCHEMAS)),
    }),
    l.dict(
      l.string({ minLength: 1 }),
      l.discriminatedUnion("type", NAMED_LEXICON_SCHEMAS),
    ),
  ),
});
export type LexiconDocument = l.Infer<typeof lexiconDocumentSchema>;
