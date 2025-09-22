import { BlobRef } from "../blob-refs.ts";
import { ValidationError, type ValidationResult } from "../types.ts";

export function blob(
  path: string,
  value: unknown,
): ValidationResult {
  // check
  if (!value || !(value instanceof BlobRef)) {
    return {
      success: false,
      error: new ValidationError(`${path} should be a blob ref`),
    };
  }
  return { success: true, value };
}
