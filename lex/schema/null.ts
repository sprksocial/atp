import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";

export class NullSchema extends Schema<null> {
  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<null> {
    if (input !== null) {
      return ctx.issueInvalidType(input, "null");
    }
    return ctx.success(null);
  }
}
