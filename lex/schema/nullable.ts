import {
  Schema,
  type ValidationResult,
  type Validator,
  type ValidatorContext,
} from "../validation.ts";

export class NullableSchema<T> extends Schema<T | null> {
  declare readonly ["_lex"]: { output: T | null };

  constructor(readonly schema: Validator<T>) {
    super();
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<T | null> {
    if (input === null) {
      return ctx.success(null);
    }
    return ctx.validate(input, this.schema);
  }
}
