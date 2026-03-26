import {
  Schema,
  type ValidationResult,
  type Validator,
  type ValidatorContext,
} from "../validation.ts";

export class OptionalSchema<T> extends Schema<T | undefined> {
  declare readonly ["_lex"]: { output: T | undefined };

  constructor(readonly schema: Validator<T>) {
    super();
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<T | undefined> {
    if (input === undefined) {
      return ctx.success(undefined);
    }
    return ctx.validate(input, this.schema);
  }
}
