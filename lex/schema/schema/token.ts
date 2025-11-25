import {
  type ValidationResult,
  Validator,
  type ValidatorContext,
} from "../validation.ts";

export class TokenSchema<V extends string = string> extends Validator<V> {
  override readonly lexiconType = "token" as const;

  constructor(protected readonly value: V) {
    super();
  }

  override validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<V> {
    if (input === this.value) {
      return ctx.success(this.value);
    }

    // @NOTE: allow using the token instance itself (but convert to the actual
    // token value)
    if (input instanceof TokenSchema && input.value === this.value) {
      return ctx.success(this.value);
    }

    if (typeof input !== "string") {
      return ctx.issueInvalidType(input, "token");
    }

    return ctx.issueInvalidValue(input, [this.value]);
  }

  // When using the TokenSchema instance as data, let's serialize it to the
  // token value

  toJSON(): string {
    return this.value;
  }

  override toString(): string {
    return this.value;
  }
}
