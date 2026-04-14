import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";
import { asUint8Array } from "../data/uint8array.ts";

export type BytesSchemaOptions = {
  minLength?: number;
  maxLength?: number;
};

export class BytesSchema extends Schema<Uint8Array> {
  constructor(readonly options: BytesSchemaOptions = {}) {
    super();
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<Uint8Array> {
    const bytes = asUint8Array(input);
    if (!bytes) {
      return ctx.issueInvalidType(input, "bytes");
    }

    const { minLength } = this.options;
    if (minLength != null && bytes.length < minLength) {
      return ctx.issueTooSmall(bytes, "bytes", minLength, bytes.length);
    }

    const { maxLength } = this.options;
    if (maxLength != null && bytes.length > maxLength) {
      return ctx.issueTooBig(bytes, "bytes", maxLength, bytes.length);
    }

    return ctx.success(bytes);
  }
}
