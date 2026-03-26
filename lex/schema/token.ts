import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";

export class TokenSchema<V extends string = any> extends Schema<V> {
  constructor(protected readonly value: V) {
    super();
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<V> {
    if (input === this.value) {
      return ctx.success(this.value);
    }

    if (input instanceof TokenSchema && input.value === this.value) {
      return ctx.success(this.value);
    }

    if (typeof input !== "string") {
      return ctx.issueInvalidType(input, "token");
    }

    return ctx.issueInvalidValue(input, [this.value]);
  }

  toJSON(): string {
    return this.value;
  }

  override toString(): string {
    return this.value;
  }
}
