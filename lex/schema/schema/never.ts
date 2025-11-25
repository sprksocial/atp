import {
  type ValidationFailure,
  Validator,
  type ValidatorContext,
} from "../validation.ts";

export class NeverSchema extends Validator<never> {
  override validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationFailure {
    return ctx.issueInvalidType(input, "never");
  }
}
