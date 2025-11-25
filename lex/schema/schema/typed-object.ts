import { isPlainObject } from "@atp/data";
import type { $Type, Simplify } from "../core.ts";
import {
  type Infer,
  type ValidationResult,
  Validator,
  type ValidatorContext,
} from "../validation.ts";

export class TypedObjectSchema<
  Type extends $Type = $Type,
  Schema extends Validator<Record<string, unknown>> = Validator<
    Record<string, unknown>
  >,
  Output extends Infer<Schema> & { $type?: Type } = Infer<Schema> & {
    $type?: Type;
  },
> extends Validator<Output> {
  override readonly lexiconType = "object" as const;

  constructor(
    readonly $type: Type,
    readonly schema: Schema,
  ) {
    super();
  }

  isTypeOf<X extends { $type?: unknown }>(
    value: X,
  ): value is X extends { $type?: Type } ? X : never {
    return value.$type === undefined || value.$type === this.$type;
  }

  build<X extends Omit<Output, "$type">>(
    input: X,
  ): Simplify<Omit<X, "$type"> & { $type: Type }> {
    return { ...input, $type: this.$type };
  }

  $isTypeOf<X extends { $type?: unknown }>(value: X) {
    return this.isTypeOf<X>(value);
  }

  $build<X extends Omit<Output, "$type">>(input: X) {
    return this.build<X>(input);
  }

  override validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<Output> {
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

    return ctx.validate(input, this.schema as Validator<Output>);
  }
}
