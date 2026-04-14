import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";
import { type Cid, isCid } from "../data/cid.ts";

export type { Cid };

export type CidSchemaOptions = {
  strict?: boolean;
};

export class CidSchema extends Schema<Cid> {
  constructor(readonly options: CidSchemaOptions = {}) {
    super();
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<Cid> {
    if (!isCid(input, this.options)) {
      return ctx.issueInvalidType(input, "cid");
    }
    return ctx.success(input);
  }
}
