import {
  type ValidationResult,
  Validator,
  type ValidatorContext,
} from "../validation.ts";

export class NullSchema extends Validator<null> {
  override readonly lexiconType = "null" as const;

  constructor() {
    super();
  }

  override validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<null> {
    if (input !== null) {
      return ctx.issueInvalidType(input, "null");
    }

    return ctx.success(null);
  }
}
