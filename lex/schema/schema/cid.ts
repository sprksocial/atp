import { CID, isCid } from "@atp/data";
import {
  type ValidationResult,
  Validator,
  type ValidatorContext,
} from "../validation.ts";

export { CID };

export type CidSchemaOptions = {
  strict?: boolean;
};

export class CidSchema extends Validator<CID> {
  override readonly lexiconType = "cid-link" as const;

  constructor(readonly options: CidSchemaOptions = {}) {
    super();
  }

  override validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<CID> {
    if (!isCid(input, this.options)) {
      return ctx.issueInvalidType(input, "cid");
    }

    return ctx.success(input);
  }
}
