import {
  assertStringFormat,
  type InferStringFormat,
  type StringFormat,
} from "../core/string-format.ts";
import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";
import { graphemeLen, utf8Len } from "../data/strings.ts";
import { asCid } from "../data/cid.ts";
import { TokenSchema } from "./token.ts";

export type StringSchemaOptions = {
  default?: string;
  format?: StringFormat;
  minLength?: number;
  maxLength?: number;
  minGraphemes?: number;
  maxGraphemes?: number;
};

export type StringSchemaOutput<Options> = Options extends
  { format: infer F extends StringFormat } ? InferStringFormat<F>
  : string;

export class StringSchema<
  const Options extends StringSchemaOptions,
> extends Schema<StringSchemaOutput<Options>> {
  constructor(readonly options: Options) {
    super();
  }

  validateInContext(
    input: unknown = this.options.default,
    ctx: ValidatorContext,
  ): ValidationResult<StringSchemaOutput<Options>> {
    const { options } = this;

    const str = coerceToString(input);
    if (str == null) {
      return ctx.issueInvalidType(input, "string");
    }

    let lazyUtf8Len: number;

    const { minLength } = options;
    if (minLength != null) {
      if ((lazyUtf8Len ??= utf8Len(str)) < minLength) {
        return ctx.issueTooSmall(str, "string", minLength, lazyUtf8Len);
      }
    }

    const { maxLength } = options;
    if (maxLength != null) {
      if (str.length * 3 <= maxLength) {
        // too small to exceed maxLength
      } else if ((lazyUtf8Len ??= utf8Len(str)) > maxLength) {
        return ctx.issueTooBig(str, "string", maxLength, lazyUtf8Len);
      }
    }

    let lazyGraphLen: number;

    const { minGraphemes } = options;
    if (minGraphemes != null) {
      if (str.length < minGraphemes) {
        return ctx.issueTooSmall(str, "grapheme", minGraphemes, str.length);
      } else if ((lazyGraphLen ??= graphemeLen(str)) < minGraphemes) {
        return ctx.issueTooSmall(str, "grapheme", minGraphemes, lazyGraphLen);
      }
    }

    const { maxGraphemes } = options;
    if (maxGraphemes != null) {
      if ((lazyGraphLen ??= graphemeLen(str)) > maxGraphemes) {
        return ctx.issueTooBig(str, "grapheme", maxGraphemes, lazyGraphLen);
      }
    }

    if (options.format !== undefined) {
      try {
        assertStringFormat(str, options.format);
      } catch (err) {
        const message = err instanceof Error ? err.message : undefined;
        return ctx.issueInvalidFormat(str, options.format, message);
      }
    }

    return ctx.success(str as StringSchemaOutput<Options>);
  }
}

export function coerceToString(input: unknown): string | null {
  switch (typeof input) {
    case "string":
      return input;
    case "object": {
      if (input == null) return null;

      if (input instanceof TokenSchema) {
        return input.toString();
      }

      if (input instanceof Date) {
        if (Number.isNaN(input.getTime())) return null;
        return input.toISOString();
      }

      if (input instanceof URL) {
        return input.toString();
      }

      const cid = asCid(input);
      if (cid) return cid.toString();

      if (input instanceof String) {
        return input.valueOf();
      }
    }
    // falls through
    default:
      return null;
  }
}
