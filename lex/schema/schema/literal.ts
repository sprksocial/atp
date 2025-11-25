import {
  type ValidationResult,
  Validator,
  type ValidatorContext,
} from "../validation.ts";

export class LiteralSchema<
  Output extends null | string | number | boolean = string,
> extends Validator<Output> {
  constructor(readonly value: Output) {
    super();
  }

  override validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<Output> {
    if (input !== this.value) {
      return ctx.issueInvalidValue(input, [this.value]);
    }

    return ctx.success(this.value);
  }
}
