import {
  Schema,
  type ValidationResult,
  type Validator,
  type ValidatorContext,
} from "../validation.ts";

export type RefSchemaGetter<V> = () => Validator<V>;

export class RefSchema<V = any> extends Schema<V> {
  #getter: RefSchemaGetter<V>;

  constructor(getter: RefSchemaGetter<V>) {
    super();
    this.#getter = getter;
  }

  get schema(): Validator<V> {
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

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<V> {
    return ctx.validate(input, this.schema);
  }
}

function throwAlreadyCalled(): never {
  throw new Error("RefSchema getter called multiple times");
}
