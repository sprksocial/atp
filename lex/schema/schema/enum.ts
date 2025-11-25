import {
  type ValidationResult,
  Validator,
  type ValidatorContext,
} from "../validation.ts";

export class EnumSchema<
  Output extends null | string | number | boolean = string,
> extends Validator<Output> {
  constructor(readonly values: readonly Output[]) {
    super();
  }

  override validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<Output> {
    if (!(this.values as readonly unknown[]).includes(input)) {
      return ctx.issueInvalidValue(input, this.values);
    }

    return ctx.success(input as Output);
  }
}
