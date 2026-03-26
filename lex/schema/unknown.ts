import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";

export class UnknownSchema extends Schema<unknown> {
  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<unknown> {
    return ctx.success(input);
  }
}
