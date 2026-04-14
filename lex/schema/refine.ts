import {
  type Infer,
  IssueCustom,
  type PropertyKey,
  type ValidationResult,
  type Validator,
  type ValidatorContext,
} from "../validation.ts";
import type { CustomAssertionContext } from "./custom.ts";

export type RefinementCheck<T> = {
  check: (value: T, ctx: CustomAssertionContext) => boolean;
  message: string;
  path?: PropertyKey | readonly PropertyKey[];
};

export type RefinementAssertion<T, Out extends T> = {
  check: (this: null, value: T, ctx: CustomAssertionContext) => value is Out;
  message: string;
  path?: PropertyKey | readonly PropertyKey[];
};

export type InferRefinement<R> = R extends RefinementCheck<infer T> ? T
  : R extends RefinementAssertion<infer T, any> ? T
  : never;

export type Refinement<T = any, Out extends T = T> =
  | RefinementCheck<T>
  | RefinementAssertion<T, Out>;

export function refine<S extends Validator, Out extends Infer<S>>(
  schema: S,
  refinement: RefinementAssertion<Infer<S>, Out>,
): S & Validator<Out>;
export function refine<S extends Validator>(
  schema: S,
  refinement: RefinementCheck<Infer<S>>,
): S;
export function refine<
  R extends Refinement,
  S extends Validator<InferRefinement<R>>,
>(schema: S, refinement: R): S;
export function refine<S extends Validator>(
  schema: S,
  refinement: Refinement<Infer<S>>,
): S {
  return Object.create(schema, {
    validateInContext: {
      value: validateInContextUnbound.bind({ schema, refinement }),
      enumerable: false,
      writable: false,
      configurable: true,
    },
  });
}

function validateInContextUnbound<S extends Validator>(
  this: { schema: S; refinement: Refinement<Infer<S>> },
  input: unknown,
  ctx: ValidatorContext,
): ValidationResult<Infer<S>> {
  const result = ctx.validate(input, this.schema);
  if (!result.success) return result;

  const checkResult = this.refinement.check.call(null, result.value, ctx);
  if (!checkResult) {
    const path = ctx.concatPath(this.refinement.path);
    return ctx.failure(new IssueCustom(path, input, this.refinement.message));
  }

  return result;
}
