import {
  type $Type,
  $type,
  type $TypeOf,
  type LexiconRecordKey,
  type NsidString,
  type Restricted,
} from "./core.ts";
import type { Infer, PropertyKey, Validator } from "./validation.ts";
import {
  ArraySchema,
  type ArraySchemaOptions,
  BlobSchema,
  type BlobSchemaOptions,
  BooleanSchema,
  type BooleanSchemaOptions,
  BytesSchema,
  type BytesSchemaOptions,
  CidSchema,
  type CidSchemaOptions,
  type CustomAssertion,
  CustomSchema,
  DictSchema,
  DiscriminatedUnionSchema,
  type DiscriminatedUnionVariants,
  EnumSchema,
  type EnumSchemaOptions,
  type InferPayload,
  type InferPayloadBody,
  type InferPayloadEncoding,
  IntegerSchema,
  type IntegerSchemaOptions,
  IntersectionSchema,
  LiteralSchema,
  type LiteralSchemaOptions,
  NeverSchema,
  NullableSchema,
  NullSchema,
  ObjectSchema,
  type ObjectSchemaShape,
  OptionalSchema,
  ParamsSchema,
  type ParamsSchemaShape,
  Payload,
  type PayloadBody,
  Permission,
  type PermissionOptions,
  PermissionSet,
  type PermissionSetOptions,
  Procedure,
  Query,
  RecordSchema,
  refine,
  RefSchema,
  type RefSchemaGetter,
  RegexpSchema,
  StringSchema,
  type StringSchemaOptions,
  Subscription,
  TokenSchema,
  TypedObjectSchema,
  type TypedRefGetter,
  TypedRefSchema,
  TypedUnionSchema,
  UnionSchema,
  type UnionSchemaValidators,
  type UnknownObjectOutput,
  UnknownObjectSchema,
  UnknownSchema,
} from "./schema.ts";

export * from "./core.ts";
export * from "./schema.ts";
export * from "./validation.ts";

export { refine };

export type BinaryData = Restricted<"Binary data">;

export type InferMethodParams<
  M extends Procedure | Query | Subscription = Procedure | Query | Subscription,
> = M extends Procedure<any, infer P extends ParamsSchema, any, any, any>
  ? Infer<P>
  : M extends Query<any, infer P extends ParamsSchema, any, any> ? Infer<P>
  : M extends Subscription<any, infer P extends ParamsSchema, any, any>
    ? Infer<P>
  : never;

export type InferMethodInput<
  M extends Procedure | Query | Subscription = Procedure | Query | Subscription,
  B = BinaryData,
> = M extends Procedure<any, any, infer I extends Payload, any, any>
  ? InferPayload<I, B>
  : undefined;

export type InferMethodInputBody<
  M extends Procedure | Query | Subscription = Procedure | Query | Subscription,
  B = BinaryData,
> = M extends Procedure<any, any, infer I extends Payload, any, any>
  ? InferPayloadBody<I, B>
  : undefined;

export type InferMethodInputEncoding<
  M extends Procedure | Query | Subscription = Procedure | Query | Subscription,
> = M extends Procedure<any, any, infer I extends Payload, any, any>
  ? InferPayloadEncoding<I>
  : undefined;

export type InferMethodOutput<
  M extends Procedure | Query | Subscription = Procedure | Query | Subscription,
  B = BinaryData,
> = M extends Procedure<any, any, any, infer O extends Payload, any>
  ? InferPayload<O, B>
  : M extends Query<any, any, infer O extends Payload, any> ? InferPayload<O, B>
  : undefined;

export type InferMethodOutputBody<
  M extends Procedure | Query | Subscription = Procedure | Query | Subscription,
  B = BinaryData,
> = M extends Procedure<any, any, any, infer O extends Payload, any>
  ? InferPayloadBody<O, B>
  : M extends Query<any, any, infer O extends Payload, any>
    ? InferPayloadBody<O, B>
  : undefined;

export type InferMethodOutputEncoding<
  M extends Procedure | Query | Subscription = Procedure | Query | Subscription,
> = M extends Procedure<any, any, any, infer O extends Payload, any>
  ? InferPayloadEncoding<O>
  : M extends Query<any, any, infer O extends Payload, any>
    ? InferPayloadEncoding<O>
  : undefined;

export type InferMethodMessage<
  M extends Procedure | Query | Subscription = Procedure | Query | Subscription,
> = M extends Subscription<any, any, infer T, any>
  ? T extends Validator ? Infer<T>
  : undefined
  : undefined;

export type InferMethodError<
  M extends Procedure | Query | Subscription = Procedure | Query | Subscription,
> = M extends { errors: readonly (infer E extends string)[] } ? E : never;

export function never(): NeverSchema {
  return new NeverSchema();
}

export function unknown(): UnknownSchema {
  return new UnknownSchema();
}

function _null(): NullSchema {
  return new NullSchema();
}
export { _null as null };

export function literal<const V extends null | string | number | boolean>(
  value: V,
  options?: LiteralSchemaOptions<V>,
): LiteralSchema<V> {
  return new LiteralSchema<V>(value, options);
}

function _enum<const V extends null | string | number | boolean>(
  values: readonly V[],
  options?: EnumSchemaOptions<V>,
): EnumSchema<V> {
  return new EnumSchema<V>(values, options);
}
export { _enum as enum };

export function boolean(options?: BooleanSchemaOptions): BooleanSchema {
  return new BooleanSchema(options ?? {});
}

export function integer(options?: IntegerSchemaOptions): IntegerSchema {
  return new IntegerSchema(options ?? {});
}

export function cidLink(options?: CidSchemaOptions): CidSchema {
  return new CidSchema(options ?? {});
}

export function bytes(options?: BytesSchemaOptions): BytesSchema {
  return new BytesSchema(options ?? {});
}

export function blob<O extends BlobSchemaOptions = NonNullable<unknown>>(
  options: O = {} as O,
): BlobSchema<O> {
  return new BlobSchema(options);
}

export function string<
  const O extends StringSchemaOptions = NonNullable<unknown>,
>(options: StringSchemaOptions & O = {} as O): StringSchema<O> {
  return new StringSchema<O>(options);
}

export function regexp<T extends string = string>(
  pattern: RegExp,
): RegexpSchema<T> {
  return new RegexpSchema<T>(pattern);
}

export function array<const S extends Validator>(
  items: S,
  options?: ArraySchemaOptions,
): ArraySchema<S>;
export function array<T, const S extends Validator<T> = Validator<T>>(
  items: S,
  options?: ArraySchemaOptions,
): ArraySchema<S>;
export function array<const S extends Validator>(
  items: S,
  options?: ArraySchemaOptions,
): ArraySchema<S> {
  return new ArraySchema<S>(items, options ?? {});
}

export function object<const P extends ObjectSchemaShape>(
  properties: P,
): ObjectSchema<P> {
  return new ObjectSchema<P>(properties);
}

export function dict<
  const K extends Validator<string>,
  const V extends Validator,
>(key: K, value: V): DictSchema<K, V> {
  return new DictSchema<K, V>(key, value);
}

export type { UnknownObjectOutput as UnknownObject };

export function unknownObject(): UnknownObjectSchema {
  return new UnknownObjectSchema();
}

export function ref<T>(get: RefSchemaGetter<T>): RefSchema<T> {
  return new RefSchema<T>(get);
}

export function custom<T>(
  assertion: CustomAssertion<T>,
  message: string,
  path?: PropertyKey | readonly PropertyKey[],
): CustomSchema<T> {
  return new CustomSchema<T>(assertion, message, path);
}

export function nullable<const S extends Validator>(
  schema: S,
): NullableSchema<Infer<S>> {
  return new NullableSchema<Infer<S>>(schema);
}

export function optional<const S extends Validator>(
  schema: S,
): OptionalSchema<Infer<S>> {
  return new OptionalSchema<Infer<S>>(schema);
}

export function union<const V extends UnionSchemaValidators>(
  validators: V,
): UnionSchema<V> {
  return new UnionSchema<V>(validators);
}

export function intersection<
  const Left extends ObjectSchema,
  const Right extends DictSchema,
>(left: Left, right: Right): IntersectionSchema<Left, Right> {
  return new IntersectionSchema<Left, Right>(left, right);
}

export function discriminatedUnion<
  const Discriminator extends string,
  const Options extends DiscriminatedUnionVariants<Discriminator>,
>(
  discriminator: Discriminator,
  variants: Options,
): DiscriminatedUnionSchema<Discriminator, Options> {
  return new DiscriminatedUnionSchema<Discriminator, Options>(
    discriminator,
    variants,
  );
}

export function token<const N extends NsidString, const H extends string>(
  nsid: N,
  hash: H,
): TokenSchema<$Type<N, H>> {
  return new TokenSchema($type(nsid, hash));
}

export function typedRef<const V extends { $type?: string }>(
  get: TypedRefGetter<V>,
): TypedRefSchema<V> {
  return new TypedRefSchema<V>(get);
}

export function typedUnion<
  const R extends readonly TypedRefSchema[],
  const C extends boolean,
>(refs: R, closed: C): TypedUnionSchema<R, C> {
  return new TypedUnionSchema<R, C>(refs, closed);
}

export function typedObject<
  const N extends NsidString,
  const H extends string,
  const S extends Validator<{ [_ in string]?: unknown }>,
>(nsid: N, hash: H, schema: S): TypedObjectSchema<$Type<N, H>, S>;
export function typedObject<V extends { $type?: $Type }>(
  nsid: V extends { $type?: infer T extends string }
    ? T extends `${infer N}#${string}` ? N : T
    : never,
  hash: V extends { $type?: infer T extends string }
    ? T extends `${string}#${infer H}` ? H : "main"
    : never,
  schema: Validator<Omit<V, "$type">>,
): TypedObjectSchema<$TypeOf<V>, Validator<Omit<V, "$type">>>;
export function typedObject<
  const N extends NsidString,
  const H extends string,
  const S extends Validator<{ [_ in string]?: unknown }>,
>(nsid: N, hash: H, schema: S) {
  return new TypedObjectSchema<$Type<N, H>, S>($type(nsid, hash), schema);
}

type AsNsid<T> = T extends `${string}#${string}` ? never : T;

export function record<
  const K extends LexiconRecordKey,
  const T extends NsidString,
  const S extends Validator<{ [_ in string]?: unknown }>,
>(key: K, type: AsNsid<T>, schema: S): RecordSchema<K, T, S>;
export function record<
  const K extends LexiconRecordKey,
  const V extends { $type: NsidString },
>(
  key: K,
  type: AsNsid<V["$type"]>,
  schema: Validator<Omit<V, "$type">>,
): RecordSchema<K, V["$type"], Validator<Omit<V, "$type">>>;
export function record<
  const K extends LexiconRecordKey,
  const T extends NsidString,
  const S extends Validator<{ [_ in string]?: unknown }>,
>(key: K, type: T, schema: S) {
  return new RecordSchema<K, T, S>(key, type, schema);
}

export function params<
  const P extends ParamsSchemaShape = NonNullable<unknown>,
>(properties: P = {} as P): ParamsSchema<P> {
  return new ParamsSchema<P>(properties);
}

export const paramsSchema: ParamsSchema<{}> = new ParamsSchema({});

export function payload<
  const E extends string | undefined = undefined,
  const S extends PayloadBody<E> = undefined,
>(
  encoding: E = undefined as E,
  schema: S = undefined as S,
): Payload<E, S> {
  return new Payload<E, S>(encoding, schema);
}

export function jsonPayload<const P extends ObjectSchemaShape>(
  properties: P,
): Payload<"application/json", ObjectSchema<P>> {
  return payload("application/json", object(properties));
}

export function query<
  const N extends NsidString,
  const P extends ParamsSchema,
  const O extends Payload,
  const E extends undefined | readonly string[] = undefined,
>(
  nsid: N,
  parameters: P,
  output: O,
  errors: E = undefined as E,
): Query<N, P, O, E> {
  return new Query<N, P, O, E>(nsid, parameters, output, errors);
}

export function procedure<
  const N extends NsidString,
  const P extends ParamsSchema,
  const I extends Payload,
  const O extends Payload,
  const E extends undefined | readonly string[] = undefined,
>(
  nsid: N,
  parameters: P,
  input: I,
  output: O,
  errors: E = undefined as E,
): Procedure<N, P, I, O, E> {
  return new Procedure<N, P, I, O, E>(nsid, parameters, input, output, errors);
}

export function subscription<
  const N extends NsidString,
  const P extends ParamsSchema,
  const M extends
    | undefined
    | RefSchema
    | TypedUnionSchema
    | ObjectSchema,
  const E extends undefined | readonly string[] = undefined,
>(
  nsid: N,
  parameters: P,
  message: M,
  errors: E = undefined as E,
): Subscription<N, P, M, E> {
  return new Subscription<N, P, M, E>(nsid, parameters, message, errors);
}

export function permission<
  const R extends string,
  const O extends PermissionOptions,
>(
  resource: R,
  options: PermissionOptions & O = {} as O,
): Permission<R, O> {
  return new Permission<R, O>(resource, options);
}

export function permissionSet<
  const N extends NsidString,
  const P extends readonly Permission[],
>(
  nsid: N,
  permissions: P,
  options?: PermissionSetOptions,
): PermissionSet<N, P> {
  return new PermissionSet<N, P>(nsid, permissions, options);
}
