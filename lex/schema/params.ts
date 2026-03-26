import { isPlainObject } from "../data/object.ts";
import type { WithOptionalProperties } from "../core/types.ts";
import { lazyProperty } from "../util/lazy-property.ts";
import {
  type Infer,
  Schema,
  type ValidationResult,
  type Validator,
  type ValidatorContext,
} from "../validation.ts";
import { type Param, type ParamScalar, paramSchema } from "./_parameters.ts";
import { StringSchema } from "./string.ts";

export type ParamsSchemaShape = Record<string, Validator<Param | undefined>>;

export type ParamsSchemaOutput<Shape extends ParamsSchemaShape> =
  WithOptionalProperties<
    {
      [K in keyof Shape]: Infer<Shape[K]>;
    }
  >;

export type InferParamsSchema<T> = T extends ParamsSchema<infer P>
  ? NonNullable<unknown> extends ParamsSchemaOutput<P>
    ? ParamsSchemaOutput<P> | undefined
  : ParamsSchemaOutput<P>
  : never;

export class ParamsSchema<
  const Shape extends ParamsSchemaShape = ParamsSchemaShape,
> extends Schema<ParamsSchemaOutput<Shape>> {
  constructor(readonly validators: Shape) {
    super();
  }

  get validatorsMap(): Map<string, Validator<Param | undefined>> {
    const map = new Map(Object.entries(this.validators));
    return lazyProperty(this, "validatorsMap", map);
  }

  validateInContext(
    input: unknown = {},
    ctx: ValidatorContext,
  ): ValidationResult<ParamsSchemaOutput<Shape>> {
    if (!isPlainObject(input)) {
      return ctx.issueInvalidType(input, "object");
    }

    let copy: Record<string, unknown> | undefined;

    for (const key in input) {
      if (this.validatorsMap.has(key)) continue;

      const result = ctx.validateChild(input, key, paramSchema);
      if (!result.success) return result;

      if (result.value !== input[key]) {
        copy ??= { ...input };
        copy[key] = result.value;
      }
    }

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

    return ctx.success((copy ?? input) as ParamsSchemaOutput<Shape>);
  }

  fromURLSearchParams(
    urlSearchParams: URLSearchParams,
  ): ParamsSchemaOutput<Shape> {
    const params: Record<string, Param> = {};

    for (const [key, value] of urlSearchParams.entries()) {
      const validator = this.validatorsMap.get(key);

      const coerced: ParamScalar =
        validator != null && validator instanceof StringSchema
          ? value
          : value === "true"
          ? true
          : value === "false"
          ? false
          : /^-?\d+$/.test(value)
          ? Number(value)
          : value;

      if (params[key] === undefined) {
        params[key] = coerced;
      } else if (Array.isArray(params[key])) {
        (params[key] as ParamScalar[]).push(coerced);
      } else {
        params[key] = [params[key] as ParamScalar, coerced];
      }
    }

    return this.parse(params);
  }

  toURLSearchParams(input: ParamsSchemaOutput<Shape>): URLSearchParams {
    const urlSearchParams = new URLSearchParams();

    if (input !== undefined) {
      for (const [key, value] of Object.entries(input)) {
        if (Array.isArray(value)) {
          for (const v of value) {
            urlSearchParams.append(key, String(v));
          }
        } else if (value !== undefined) {
          urlSearchParams.append(key, String(value));
        }
      }
    }

    return urlSearchParams;
  }
}
