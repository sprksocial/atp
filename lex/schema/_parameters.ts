import { ArraySchema } from "./array.ts";
import { BooleanSchema } from "./boolean.ts";
import { DictSchema } from "./dict.ts";
import { IntegerSchema } from "./integer.ts";
import { StringSchema } from "./string.ts";
import { UnionSchema } from "./union.ts";
import type { Infer, Validator } from "../validation.ts";

export type ParamScalar = Infer<typeof paramScalarSchema>;
const paramScalarSchema: UnionSchema<
  readonly [
    BooleanSchema,
    IntegerSchema,
    StringSchema<NonNullable<unknown>>,
  ]
> = new UnionSchema([
  new BooleanSchema({}),
  new IntegerSchema({}),
  new StringSchema({}),
]);

export type Param = Infer<typeof paramSchema>;
export const paramSchema: UnionSchema<
  readonly [
    typeof paramScalarSchema,
    ArraySchema<typeof paramScalarSchema>,
  ]
> = new UnionSchema([
  paramScalarSchema,
  new ArraySchema(paramScalarSchema, {}),
]);

export type Params = { [_: string]: undefined | Param };
export const paramsSchema: DictSchema<
  StringSchema<NonNullable<unknown>>,
  typeof paramSchema
> = new DictSchema(
  new StringSchema({}),
  paramSchema,
) satisfies Validator<Params>;
