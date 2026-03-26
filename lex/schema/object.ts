import type { WithOptionalProperties } from "../core/types.ts";
import { lazyProperty } from "../util/lazy-property.ts";
import { isPlainObject } from "../data/object.ts";
import {
  type Infer,
  Schema,
  type ValidationResult,
  type Validator,
  type ValidatorContext,
} from "../validation.ts";

export type ObjectSchemaShape = Record<string, Validator>;

export type ObjectSchemaOutput<Shape extends ObjectSchemaShape> =
  WithOptionalProperties<
    {
      [K in keyof Shape]: Infer<Shape[K]>;
    }
  >;

export class ObjectSchema<
  const Shape extends ObjectSchemaShape = any,
> extends Schema<ObjectSchemaOutput<Shape>> {
  constructor(readonly shape: Shape) {
    super();
  }

  get validatorsMap(): Map<string, Validator> {
    const map = new Map(Object.entries(this.shape));
    return lazyProperty(this, "validatorsMap", map);
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<ObjectSchemaOutput<Shape>> {
    if (!isPlainObject(input)) {
      return ctx.issueInvalidType(input, "object");
    }

    let copy: Record<string, unknown> | undefined;

    for (const [key, propDef] of this.validatorsMap) {
      const result = ctx.validateChild(input, key, propDef);
      if (!result.success) {
        if (!(key in input)) {
          return ctx.issueRequiredKey(input, key);
        }
        return result;
      }

      if (result.value === undefined && !(key in input)) {
        continue;
      }

      if (result.value !== input[key]) {
        copy ??= { ...input };
        copy[key] = result.value;
      }
    }

    return ctx.success((copy ?? input) as ObjectSchemaOutput<Shape>);
  }
}
