import {
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";
import {
  type BlobRef,
  isBlobRef,
  isLegacyBlobRef,
  type LegacyBlobRef,
} from "../data/blob.ts";

export type { BlobRef, LegacyBlobRef };

export type BlobSchemaOptions = {
  allowLegacy?: boolean;
  strict?: boolean;
  accept?: string[];
  maxSize?: number;
};

export type BlobSchemaOutput<Options> = Options extends { allowLegacy: true }
  ? BlobRef | LegacyBlobRef
  : BlobRef;

export class BlobSchema<O extends BlobSchemaOptions = any> extends Schema<
  BlobSchemaOutput<O>
> {
  constructor(readonly options: O) {
    super();
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<BlobSchemaOutput<O>> {
    if (!isBlob(input, this.options)) {
      return ctx.issueInvalidType(input, "blob");
    }
    return ctx.success(input);
  }
}

function isBlob<O extends BlobSchemaOptions>(
  input: unknown,
  options: O,
): input is BlobSchemaOutput<O> {
  if ((input as any)?.$type !== undefined) {
    return isBlobRef(input, options);
  }
  if (options.allowLegacy === true) {
    return isLegacyBlobRef(input);
  }
  return false;
}
