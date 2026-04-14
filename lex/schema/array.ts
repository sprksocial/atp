import {
  type Infer,
  Schema,
  type ValidationResult,
  type Validator,
  type ValidatorContext,
} from "../validation.ts";

export type ArraySchemaOptions = {
  minLength?: number;
  maxLength?: number;
};

export class ArraySchema<
  const S extends Validator,
> extends Schema<Infer<S>[]> {
  constructor(
    readonly items: S,
    readonly options: ArraySchemaOptions = {},
  ) {
    super();
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<Infer<S>[]> {
    if (!Array.isArray(input)) {
      return ctx.issueInvalidType(input, "array");
    }

    const { minLength } = this.options;
    if (minLength != null && input.length < minLength) {
      return ctx.issueTooSmall(input, "array", minLength, input.length);
    }

    const { maxLength } = this.options;
    if (maxLength != null && input.length > maxLength) {
      return ctx.issueTooBig(input, "array", maxLength, input.length);
    }

    let copy: unknown[] | undefined;

    for (let i = 0; i < input.length; i++) {
      const result = ctx.validateChild(
        input as Record<number, unknown>,
        i,
        this.items,
      );
      if (!result.success) return result;

      if (result.value !== input[i]) {
        copy ??= [...input];
        copy[i] = result.value;
      }
    }

    return ctx.success((copy ?? input) as Infer<S>[]);
  }
}
