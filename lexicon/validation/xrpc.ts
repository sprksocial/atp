import type { Lexicons } from "../lexicons.ts";
import {
  type LexXrpcParameters,
  ValidationError,
  type ValidationResult,
} from "../types.ts";
import { array } from "./complex.ts";
import * as PrimitiveValidators from "./primitives.ts";

export function params(
  lexicons: Lexicons,
  path: string,
  def: LexXrpcParameters,
  val: unknown,
): ValidationResult<Record<string, unknown>> {
  // type
  const value = val && typeof val === "object" ? val : {};

  const requiredProps = new Set(def.required ?? []);

  // properties
  let resultValue = value as Record<string, unknown>;
  if (typeof def.properties === "object") {
    for (const key in def.properties) {
      const propDef = def.properties[key];
      const validated = propDef.type === "array"
        ? array(lexicons, key, propDef, resultValue[key])
        : PrimitiveValidators.validate(key, propDef, resultValue[key]);
      const propValue = validated.success ? validated.value : resultValue[key];
      const propIsUndefined = typeof propValue === "undefined";
      // Return error for bad validation, giving required rule precedence
      if (propIsUndefined && requiredProps.has(key)) {
        return {
          success: false,
          error: new ValidationError(`${path} must have the property "${key}"`),
        };
      } else if (!propIsUndefined && !validated.success) {
        return validated;
      }
      // Adjust value based on e.g. applied defaults, cloning shallowly if there was a changed value
      if (propValue !== resultValue[key]) {
        if (resultValue === value) {
          // Lazy shallow clone
          resultValue = { ...value };
        }
        resultValue[key] = propValue;
      }
    }
  }

  return { success: true, value: resultValue };
}
