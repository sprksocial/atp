import type { $Typed } from "../core.ts";
import {
  Schema,
  type ValidationResult,
  type Validator,
  type ValidatorContext,
} from "../validation.ts";

export type TypedRefSchemaValidator<V extends { $type?: string } = any> =
  V extends { $type?: infer T extends string }
    ? { $type: T } & Validator<V & { $type?: T }>
    : never;

export type TypedRefGetter<V extends { $type?: string } = any> = () =>
  TypedRefSchemaValidator<V>;

export type TypedRefSchemaOutput<V extends { $type?: string } = any> = V extends
  { $type?: infer T extends string } ? $Typed<V, T> : never;

export class TypedRefSchema<V extends { $type?: string } = any> extends Schema<
  TypedRefSchemaOutput<V>
> {
  #getter: TypedRefGetter<V>;

  constructor(getter: TypedRefGetter<V>) {
    super();
    this.#getter = getter;
  }

  get schema(): TypedRefSchemaValidator<V> {
    const value = this.#getter.call(null);

    this.#getter = throwAlreadyCalled;

    Object.defineProperty(this, "schema", {
      value,
      writable: false,
      enumerable: false,
      configurable: true,
    });

    return value;
  }

  get $type(): TypedRefSchemaOutput<V>["$type"] {
    return this.schema.$type;
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<TypedRefSchemaOutput<V>> {
    const result = ctx.validate(input, this.schema);
    if (!result.success) return result;

    if (result.value.$type !== this.$type) {
      return ctx.issueInvalidPropertyValue(result.value, "$type", [
        this.$type,
      ]);
    }

    return result as ValidationResult<TypedRefSchemaOutput<V>>;
  }
}

function throwAlreadyCalled(): never {
  throw new Error("TypedRefSchema getter called multiple times");
}
