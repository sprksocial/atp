import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";

export class RegexpSchema<T extends string = string> extends Schema<T> {
  constructor(readonly pattern: RegExp) {
    super();
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<T> {
    if (typeof input !== "string") {
      return ctx.issueInvalidType(input, "string");
    }
    if (!this.pattern.test(input)) {
      return ctx.issueInvalidFormat(input, this.pattern.toString());
    }
    return ctx.success(input as T);
  }
}
