import { isPlainObject } from "../data/object.ts";
import {
  type Infer,
  Schema,
  type ValidationResult,
  type Validator,
  type ValidatorContext,
} from "../validation.ts";

export type DictSchemaOutput<
  KeySchema extends Validator<string>,
  ValueSchema extends Validator,
> = Record<Infer<KeySchema>, Infer<ValueSchema>>;

export class DictSchema<
  const KeySchema extends Validator<string> = any,
  const ValueSchema extends Validator = any,
> extends Schema<DictSchemaOutput<KeySchema, ValueSchema>> {
  constructor(
    readonly keySchema: KeySchema,
    readonly valueSchema: ValueSchema,
  ) {
    super();
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
    options?: { ignoredKeys?: { has(k: string): boolean } },
  ): ValidationResult<DictSchemaOutput<KeySchema, ValueSchema>> {
    if (!isPlainObject(input)) {
      return ctx.issueInvalidType(input, "dict");
    }

    let copy: Record<string, unknown> | undefined;

    for (const key in input) {
      if (options?.ignoredKeys?.has(key)) continue;

      const keyResult = ctx.validate(key, this.keySchema);
      if (!keyResult.success) return keyResult;

      if (keyResult.value !== key) {
        return ctx.issueRequiredKey(input, key);
      }

      const valueResult = ctx.validateChild(input, key, this.valueSchema);
      if (!valueResult.success) return valueResult;

      if (valueResult.value !== input[key]) {
        copy ??= { ...input };
        copy[key] = valueResult.value;
      }
    }

    return ctx.success(
      (copy ?? input) as DictSchemaOutput<KeySchema, ValueSchema>,
    );
  }
}
