import type {
  ValidationOptions,
  ValidationResult,
  Validator,
} from "./validator.ts";
import { ValidatorContext } from "./validator.ts";

export abstract class Schema<Output> implements Validator<Output> {
  declare readonly ["_lex"]: { output: Output };

  abstract validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<Output>;

  assert(input: unknown): asserts input is Output {
    const result = this.safeParse(input, { allowTransform: false });
    if (!result.success) throw result.error;
  }

  matches(input: unknown): input is Output {
    const result = this.safeParse(input, { allowTransform: false });
    return result.success;
  }

  ifMatches<I>(input: I): (I & Output) | undefined {
    return this.matches(input) ? input : undefined;
  }

  parse<I>(
    input: I,
    options: ValidationOptions & { allowTransform: false },
  ): I & Output;
  parse(input: unknown, options?: ValidationOptions): Output;
  parse(input: unknown, options?: ValidationOptions): Output {
    const result = this.safeParse(input, options);
    if (!result.success) throw result.error;
    return result.value;
  }

  safeParse<I>(
    input: I,
    options: ValidationOptions & { allowTransform: false },
  ): ValidationResult<I & Output>;
  safeParse(
    input: unknown,
    options?: ValidationOptions,
  ): ValidationResult<Output>;
  safeParse(
    input: unknown,
    options?: ValidationOptions,
  ): ValidationResult<Output> {
    return ValidatorContext.validate(input, this, options);
  }

  $assert(input: unknown): asserts input is Output {
    return this.assert(input);
  }

  $matches(input: unknown): input is Output {
    return this.matches(input);
  }

  $ifMatches<I>(input: I): (I & Output) | undefined {
    return this.ifMatches(input);
  }

  $parse(input: unknown, options?: ValidationOptions): Output {
    return this.parse(input, options);
  }

  $safeParse(
    input: unknown,
    options?: ValidationOptions,
  ): ValidationResult<Output> {
    return this.safeParse(input, options);
  }
}
