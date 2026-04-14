import {
  type Infer,
  Schema,
  type ValidationFailure,
  type ValidationResult,
  type Validator,
  type ValidatorContext,
} from "../validation.ts";
import { ValidationError } from "../validation/validation-error.ts";

export type UnionSchemaValidators = readonly Validator[];

export type UnionSchemaOutput<V extends UnionSchemaValidators> = Infer<
  V[number]
>;

export class UnionSchema<
  const V extends UnionSchemaValidators,
> extends Schema<UnionSchemaOutput<V>> {
  constructor(readonly validators: V) {
    super();
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<UnionSchemaOutput<V>> {
    const failures: ValidationFailure[] = [];

    for (const validator of this.validators) {
      const result = ctx.validate(input, validator);
      if (result.success) {
        return result as ValidationResult<UnionSchemaOutput<V>>;
      }
      failures.push(result);
    }

    if (failures.length === 1) {
      return failures[0];
    }

    return {
      success: false,
      error: ValidationError.fromFailures(failures),
    };
  }
}
