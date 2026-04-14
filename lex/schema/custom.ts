import {
  IssueCustom,
  type PropertyKey,
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";

export type CustomAssertionContext = {
  path: PropertyKey[];
  addIssue(issue: IssueCustom): void;
};

export type CustomAssertion<T = any> = (
  this: null,
  input: unknown,
  ctx: CustomAssertionContext,
) => input is T;

export class CustomSchema<T = unknown> extends Schema<T> {
  constructor(
    private readonly assertion: CustomAssertion<T>,
    private readonly message: string,
    private readonly path?: PropertyKey | readonly PropertyKey[],
  ) {
    super();
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<T> {
    if (this.assertion.call(null, input, ctx)) return ctx.success(input as T);
    const path = ctx.concatPath(this.path);
    return ctx.failure(new IssueCustom(path, input, this.message));
  }
}
