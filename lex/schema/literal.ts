import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";

export type LiteralSchemaOptions<V> = {
  description?: string;
  default?: V;
};

export class LiteralSchema<
  const V extends null | string | number | boolean,
> extends Schema<V> {
  constructor(
    readonly value: V,
    readonly options: LiteralSchemaOptions<V> = {},
  ) {
    super();
  }

  validateInContext(
    input: unknown = this.options.default,
    ctx: ValidatorContext,
  ): ValidationResult<V> {
    if (input !== this.value) {
      return ctx.issueInvalidValue(input, [this.value]);
    }
    return ctx.success(input as V);
  }
}
