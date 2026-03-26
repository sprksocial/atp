import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";

export type EnumSchemaOptions<V extends null | string | number | boolean> = {
  description?: string;
  default?: V;
};

export class EnumSchema<
  const V extends null | string | number | boolean,
> extends Schema<V> {
  constructor(
    readonly values: readonly V[],
    readonly options: EnumSchemaOptions<V> = {},
  ) {
    super();
  }

  validateInContext(
    input: unknown = this.options.default,
    ctx: ValidatorContext,
  ): ValidationResult<V> {
    if (!(this.values as readonly unknown[]).includes(input)) {
      return ctx.issueInvalidValue(input, this.values);
    }
    return ctx.success(input as V);
  }
}
