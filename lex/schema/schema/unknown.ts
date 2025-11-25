import {
  type ValidationResult,
  Validator,
  type ValidatorContext,
} from "../validation.ts";

export class UnknownSchema extends Validator<unknown> {
  override validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<unknown> {
    return ctx.success(input);
  }
}
