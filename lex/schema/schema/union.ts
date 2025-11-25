import {
  type Infer,
  ValidationError,
  type ValidationFailure,
  type ValidationResult,
  Validator,
  type ValidatorContext,
} from "../validation.ts";

export type UnionSchemaValidators = readonly [Validator, ...Validator[]];
export type UnionSchemaOutput<V extends readonly Validator[]> = Infer<
  V[number]
>;

export class UnionSchema<
  V extends UnionSchemaValidators = UnionSchemaValidators,
> extends Validator<UnionSchemaOutput<V>> {
  constructor(protected readonly validators: V) {
    super();
  }

  override validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<UnionSchemaOutput<V>> {
    const failures: ValidationFailure[] = [];

    for (const validator of this.validators) {
      const result = ctx.validate(input, validator);
      if (result.success) {
        return result as ValidationResult<UnionSchemaOutput<V>>;
      } else {
        failures.push(result);
      }
    }

    return {
      success: false,
      error: ValidationError.fromFailures(failures),
    };
  }
}
