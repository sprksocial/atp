import type { Simplify } from "../core/types.ts";
import {
  type Infer,
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";
import type { DictSchema } from "./dict.ts";
import type { ObjectSchema } from "./object.ts";

export type Intersect<A, B> = B[keyof B] extends never ? A
  : keyof A & keyof B extends never ? A & B
  : A & { [K in keyof B]: B[K] | A[keyof A & K] };

export type IntersectionSchemaOutput<
  Left extends ObjectSchema,
  Right extends DictSchema,
> = Simplify<Intersect<Infer<Left>, Infer<Right>>>;

export class IntersectionSchema<
  const Left extends ObjectSchema = any,
  const Right extends DictSchema = any,
> extends Schema<IntersectionSchemaOutput<Left, Right>> {
  constructor(
    protected readonly left: Left,
    protected readonly right: Right,
  ) {
    super();
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<IntersectionSchemaOutput<Left, Right>> {
    const leftResult = ctx.validate(input, this.left);
    if (!leftResult.success) return leftResult;

    return this.right.validateInContext(leftResult.value, ctx, {
      ignoredKeys: this.left.validatorsMap,
    }) as ValidationResult<IntersectionSchemaOutput<Left, Right>>;
  }
}
