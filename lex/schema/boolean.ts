import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";

export type BooleanSchemaOptions = {
  default?: boolean;
  const?: boolean;
};

export class BooleanSchema<
  const Options extends BooleanSchemaOptions = any,
> extends Schema<boolean> {
  constructor(readonly options: Options) {
    super();
  }

  validateInContext(
    input: unknown = this.options.default,
    ctx: ValidatorContext,
  ): ValidationResult<boolean> {
    const bool = coerceToBoolean(input);
    if (bool == null) {
      return ctx.issueInvalidType(input, "boolean");
    }

    if (this.options.const !== undefined && bool !== this.options.const) {
      return ctx.issueInvalidValue(bool, [this.options.const]);
    }

    return ctx.success(bool);
  }
}

function coerceToBoolean(input: unknown): boolean | null {
  if (typeof input === "boolean") return input;
  if (input === "true") return true;
  if (input === "false") return false;
  return null;
}
