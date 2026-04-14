import {
  failure,
  type ResultFailure,
  type ResultSuccess,
  success,
} from "../core/result.ts";
import type { PropertyKey } from "./property-key.ts";
import { ValidationError } from "./validation-error.ts";
import {
  type Issue,
  IssueInvalidFormat,
  IssueInvalidType,
  IssueInvalidValue,
  IssueRequiredKey,
  IssueTooBig,
  IssueTooSmall,
  type MeasurableType,
} from "./validation-issue.ts";

export type ValidationSuccess<Value = any> = ResultSuccess<Value>;
export type ValidationFailure = ResultFailure<ValidationError>;
export type ValidationResult<Value = any> =
  | ValidationSuccess<Value>
  | ValidationFailure;

export type ValidationOptions = {
  path?: PropertyKey[];
  /** @default true */
  allowTransform?: boolean;
};

export type Infer<T extends Validator> = T["_lex"]["output"];

export interface Validator<Output = any> {
  /**
   * Used for type inference only — does not exist at runtime.
   * @deprecated **INTERNAL API, DO NOT USE**
   */
  readonly ["_lex"]: { output: Output };

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<Output>;
}

export class ValidatorContext {
  static validate<V>(
    input: unknown,
    validator: Validator<V>,
    options: ValidationOptions = {},
  ): ValidationResult<V> {
    const context = new ValidatorContext(options);
    return context.validate(input, validator);
  }

  private readonly currentPath: PropertyKey[];
  private readonly issues: Issue[] = [];

  protected constructor(readonly options: ValidationOptions) {
    this.currentPath = options?.path != null ? Array.from(options.path) : [];
  }

  get path() {
    return Array.from(this.currentPath);
  }

  concatPath(path?: PropertyKey | readonly PropertyKey[]) {
    if (path == null) return this.path;
    return this.currentPath.concat(path);
  }

  validate<V>(input: unknown, validator: Validator<V>): ValidationResult<V> {
    const result = validator.validateInContext(input, this);

    if (result.success) {
      if (
        this.options?.allowTransform === false &&
        !Object.is(result.value, input)
      ) {
        return this.issueInvalidValue(input, [result.value]);
      }

      if (this.issues.length > 0) {
        return failure(new ValidationError(Array.from(this.issues)));
      }
    }

    return result as ValidationResult<V>;
  }

  validateChild<
    I extends object,
    K extends PropertyKey & keyof I,
    V extends Validator,
  >(input: I, key: K, validator: V): ValidationResult<Infer<V>> {
    this.currentPath.push(key);
    try {
      return this.validate(input[key], validator);
    } finally {
      this.currentPath.length--;
    }
  }

  addIssue(issue: Issue): void {
    this.issues.push(issue);
  }

  success<V>(value: V): ValidationResult<V> {
    return success(value);
  }

  failure(issue: Issue): ValidationFailure {
    return failure(new ValidationError([...this.issues, issue]));
  }

  issueInvalidValue(input: unknown, values: readonly unknown[]) {
    return this.failure(new IssueInvalidValue(this.path, input, values));
  }

  issueInvalidType(input: unknown, expected: string) {
    return this.failure(new IssueInvalidType(this.path, input, [expected]));
  }

  issueRequiredKey(input: object, key: PropertyKey) {
    return this.failure(new IssueRequiredKey(this.path, input, key));
  }

  issueInvalidFormat(input: unknown, format: string, msg?: string) {
    return this.failure(
      new IssueInvalidFormat(this.path, input, format, msg),
    );
  }

  issueTooBig(
    input: unknown,
    type: MeasurableType,
    max: number,
    actual: number,
  ) {
    return this.failure(new IssueTooBig(this.path, input, max, type, actual));
  }

  issueTooSmall(
    input: unknown,
    type: MeasurableType,
    min: number,
    actual: number,
  ) {
    return this.failure(
      new IssueTooSmall(this.path, input, min, type, actual),
    );
  }

  issueInvalidPropertyValue<I>(
    input: I,
    property: keyof I & PropertyKey,
    values: readonly unknown[],
  ) {
    const value = input[property];
    const path = this.concatPath(property);
    return this.failure(new IssueInvalidValue(path, value, values));
  }

  issueInvalidPropertyType<I>(
    input: I,
    property: keyof I & PropertyKey,
    expected: string,
  ) {
    const value = input[property];
    const path = this.concatPath(property);
    return this.failure(new IssueInvalidType(path, value, [expected]));
  }
}
