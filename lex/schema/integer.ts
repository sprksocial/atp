import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";

export type IntegerSchemaOptions = {
  default?: number;
  minimum?: number;
  maximum?: number;
  enum?: readonly number[];
  const?: number;
};

export class IntegerSchema<
  const Options extends IntegerSchemaOptions = any,
> extends Schema<number> {
  constructor(readonly options: Options) {
    super();
  }

  validateInContext(
    input: unknown = this.options.default,
    ctx: ValidatorContext,
  ): ValidationResult<number> {
    const int = coerceToInteger(input);
    if (int == null) {
      return ctx.issueInvalidType(input, "integer");
    }

    const { minimum } = this.options;
    if (minimum != null && int < minimum) {
      return ctx.issueTooSmall(int, "integer", minimum, int);
    }

    const { maximum } = this.options;
    if (maximum != null && int > maximum) {
      return ctx.issueTooBig(int, "integer", maximum, int);
    }

    const { enum: enumValues } = this.options;
    if (enumValues != null && !enumValues.includes(int)) {
      return ctx.issueInvalidValue(int, enumValues);
    }

    const { const: constValue } = this.options;
    if (constValue !== undefined && int !== constValue) {
      return ctx.issueInvalidValue(int, [constValue]);
    }

    return ctx.success(int);
  }
}

function coerceToInteger(input: unknown): number | null {
  switch (typeof input) {
    case "number":
      return Number.isInteger(input) ? input : null;
    case "string": {
      if (!/^-?\d+$/.test(input)) return null;
      const n = Number(input);
      return Number.isInteger(n) ? n : null;
    }
    default:
      return null;
  }
}
