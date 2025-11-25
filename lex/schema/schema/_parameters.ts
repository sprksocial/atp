import type { Infer, Validator } from "../validation.ts";
import { ArraySchema } from "./array.ts";
import { BooleanSchema } from "./boolean.ts";
import { DictSchema } from "./dict.ts";
import { IntegerSchema } from "./integer.ts";
import { StringSchema } from "./string.ts";
import { UnionSchema } from "./union.ts";

export type ParamScalar = Infer<typeof paramScalarSchema>;
const paramScalarSchema = new UnionSchema([
  new BooleanSchema({}),
  new IntegerSchema({}),
  new StringSchema({}),
]);

export type Param = Infer<typeof paramSchema>;
export const paramSchema = new UnionSchema([
  paramScalarSchema,
  new ArraySchema(paramScalarSchema, {}),
]);

export type Params = { [_: string]: undefined | Param };
export const paramsSchema = new DictSchema(
  new StringSchema({}),
  paramSchema,
) satisfies Validator<Params>;
