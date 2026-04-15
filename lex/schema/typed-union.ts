import { isPlainObject } from "../data/object.ts";
import type { Restricted, UnknownString } from "../core/types.ts";
import { lazyProperty } from "../util/lazy-property.ts";
import {
  type Infer,
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";
import type { TypedRefSchema, TypedRefSchemaOutput } from "./typed-ref.ts";

export type TypedRef<T extends { $type?: string }> = TypedRefSchemaOutput<T>;

export type TypedObject =
  & { $type: UnknownString }
  & {
    [K in string]: Restricted<"Unknown property">;
  };

type TypedRefSchemasToUnion<T extends readonly TypedRefSchema[]> = {
  [K in keyof T]: Infer<T[K]>;
}[number];

export type TypedUnionSchemaOutput<
  TypedRefs extends readonly TypedRefSchema[],
  Closed extends boolean,
> = Closed extends true ? TypedRefSchemasToUnion<TypedRefs>
  : TypedRefSchemasToUnion<TypedRefs> | TypedObject;

export class TypedUnionSchema<
  TypedRefs extends readonly TypedRefSchema[] = any,
  Closed extends boolean = any,
> extends Schema<TypedUnionSchemaOutput<TypedRefs, Closed>> {
  constructor(
    protected readonly refs: TypedRefs,
    public readonly closed: Closed,
  ) {
    super();
  }

  get refsMap(): Map<unknown, TypedRefs[number]> {
    const map = new Map<unknown, TypedRefs[number]>();
    for (const ref of this.refs) map.set(ref.$type, ref);
    return lazyProperty(this, "refsMap", map);
  }

  get $types(): TypedRefs[number]["$type"][] {
    return Array.from(this.refsMap.keys());
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<TypedUnionSchemaOutput<TypedRefs, Closed>> {
    if (!isPlainObject(input) || !("$type" in input)) {
      return ctx.issueInvalidType(input, "$typed");
    }

    const { $type } = input;

    const def = this.refsMap.get($type);
    if (def) {
      return ctx.validate(input, def) as ValidationResult<
        TypedUnionSchemaOutput<TypedRefs, Closed>
      >;
    }

    if (this.closed) {
      return ctx.issueInvalidPropertyValue(input, "$type", this.$types);
    }

    if (typeof $type !== "string") {
      return ctx.issueInvalidPropertyType(input, "$type", "string");
    }

    return ctx.success(
      input as TypedUnionSchemaOutput<TypedRefs, Closed>,
    );
  }
}
