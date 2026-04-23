import { isCid } from "../data/cid.ts";
import { isPlainObject } from "../data/object.ts";
import type { Unknown$TypedObject } from "../core.ts";
import { lazyProperty } from "../util/lazy-property.ts";
import {
  type Infer,
  IssueInvalidType,
  type PropertyKey,
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";
import type { TypedRefSchema, TypedRefSchemaOutput } from "./typed-ref.ts";

export type TypedRef<T extends { $type?: string }> = TypedRefSchemaOutput<T>;

export type TypedObject = Unknown$TypedObject;

type TypedRefSchemasToUnion<T extends readonly TypedRefSchema[]> = {
  [K in keyof T]: Infer<T[K]>;
}[number];

export type TypedUnionSchemaOutput<
  TypedRefs extends readonly TypedRefSchema[],
  Closed extends boolean,
> = Closed extends true ? TypedRefSchemasToUnion<TypedRefs>
  : TypedRefSchemasToUnion<TypedRefs> | TypedObject;

const LEX_VALUE_TYPES = [
  "integer",
  "string",
  "boolean",
  "null",
  "array",
  "object",
  "bytes",
  "cid",
] as const;

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

    const invalidLexValue = findInvalidLexValue(input);
    if (invalidLexValue) {
      return ctx.failure(
        new IssueInvalidType(
          ctx.concatPath(invalidLexValue.path),
          invalidLexValue.value,
          LEX_VALUE_TYPES,
        ),
      );
    }

    return ctx.success(
      input as TypedUnionSchemaOutput<TypedRefs, Closed>,
    );
  }
}

function findInvalidLexValue(
  value: unknown,
  path: PropertyKey[] = [],
): { path: PropertyKey[]; value: unknown } | undefined {
  switch (typeof value) {
    case "number":
      return Number.isInteger(value) ? undefined : { path, value };
    case "string":
    case "boolean":
      return undefined;
    case "object":
      if (value === null || value instanceof Uint8Array || isCid(value)) {
        return undefined;
      }
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const invalid = findInvalidLexValue(value[i], path.concat(i));
          if (invalid) return invalid;
        }
        return undefined;
      }
      if (isPlainObject(value)) {
        for (const key in value as Record<string, unknown>) {
          const invalid = findInvalidLexValue(
            (value as Record<string, unknown>)[key],
            path.concat(key),
          );
          if (invalid) return invalid;
        }
        return undefined;
      }
      return { path, value };
    default:
      return { path, value };
  }
}
