import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";

export class NeverSchema extends Schema<never> {
  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<never> {
    return ctx.issueInvalidType(input, "never");
  }
}
