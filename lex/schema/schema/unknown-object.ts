import { isLexMap, type LexMap } from "@atp/data";
import {
  type ValidationResult,
  Validator,
  type ValidatorContext,
} from "../validation.ts";

export type { LexMap };
export type UnknownObjectOutput = LexMap;

export class UnknownObjectSchema extends Validator<UnknownObjectOutput> {
  override readonly lexiconType = "unknown" as const;

  override validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<UnknownObjectOutput> {
    if (isLexMap(input)) {
      return ctx.success(input);
    }

    return ctx.issueInvalidType(input, "unknown");
  }
}
