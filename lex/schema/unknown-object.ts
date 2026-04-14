import { isPlainObject } from "../data/object.ts";
import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";

export type UnknownObjectOutput = Record<string, unknown>;

export class UnknownObjectSchema extends Schema<UnknownObjectOutput> {
  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<UnknownObjectOutput> {
    if (!isPlainObject(input)) {
      return ctx.issueInvalidType(input, "object");
    }
    return ctx.success(input);
  }
}
