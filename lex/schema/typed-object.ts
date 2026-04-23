import { isPlainObject } from "../data/object.ts";
import type { $Type, $Typed, $TypedMaybe, Un$Typed } from "../core.ts";
import { $typed } from "../core.ts";
import {
  type Infer,
  Schema,
  type ValidationResult,
  type Validator,
  type ValidatorContext,
} from "../validation.ts";

export type MaybeTypedObject<
  T extends $Type,
  V extends { $type?: unknown } = { $type?: unknown },
> = V extends { $type?: T } ? V
  : $TypedMaybe<V, T>;

export type TypedObjectSchemaOutput<
  T extends $Type,
  S extends Validator<{ [_ in string]?: unknown }>,
> = $TypedMaybe<Infer<S>, T>;

export class TypedObjectSchema<
  const T extends $Type = any,
  const S extends Validator<{ [_ in string]?: unknown }> = any,
> extends Schema<TypedObjectSchemaOutput<T, S>> {
  constructor(
    readonly $type: T,
    readonly schema: S,
  ) {
    super();
  }

  isTypeOf<X extends Record<string, unknown>>(
    value: X,
  ): value is MaybeTypedObject<T, X> {
    return value.$type === undefined || value.$type === this.$type;
  }

  build<X extends Omit<Infer<S>, "$type">>(
    input: X,
  ): $Typed<Un$Typed<X & { $type?: unknown }>, T> {
    return $typed(input, this.$type);
  }

  $isTypeOf<X extends Record<string, unknown>>(
    value: X,
  ): value is MaybeTypedObject<T, X> {
    return this.isTypeOf(value);
  }

  $build<X extends Omit<Infer<S>, "$type">>(
    input: X,
  ): $Typed<Un$Typed<X & { $type?: unknown }>, T> {
    return this.build<X>(input);
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<TypedObjectSchemaOutput<T, S>> {
    if (!isPlainObject(input)) {
      return ctx.issueInvalidType(input, "object");
    }

    if (
      "$type" in input &&
      input.$type !== undefined &&
      input.$type !== this.$type
    ) {
      return ctx.issueInvalidPropertyValue(input, "$type", [this.$type]);
    }

    return ctx.validate(input, this.schema) as ValidationResult<
      TypedObjectSchemaOutput<T, S>
    >;
  }
}
