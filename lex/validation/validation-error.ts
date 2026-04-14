import { failureError, type ResultFailure } from "../core/result.ts";
import { arrayAgg } from "../util/array-agg.ts";
import {
  type Issue,
  IssueInvalidType,
  IssueInvalidValue,
} from "./validation-issue.ts";

export class ValidationError extends Error {
  override name = "ValidationError";

  readonly issues: Issue[];

  constructor(issues: Issue[], options?: ErrorOptions) {
    const issuesAgg = aggregateIssues(issues);
    super(issuesAgg.join(", "), options);
    this.issues = issuesAgg;
  }

  static fromFailures(
    failures: ResultFailure<ValidationError>[],
  ): ValidationError {
    if (failures.length === 1) return failures[0].error;
    const issues = failures.flatMap(extractFailureIssues);
    return new ValidationError(issues, {
      cause: failures.map(failureError),
    });
  }
}

function extractFailureIssues(result: ResultFailure<ValidationError>) {
  return result.error.issues;
}

function aggregateIssues(issues: Issue[]): Issue[] {
  if (issues.length <= 1) return issues;
  if (issues.length === 2 && issues[0].code !== issues[1].code) return issues;

  return [
    ...arrayAgg(
      issues.filter((issue) => issue instanceof IssueInvalidType),
      (a, b) => comparePropertyPaths(a.path, b.path),
      (issues) =>
        new IssueInvalidType(
          issues[0].path,
          issues[0].input,
          Array.from(new Set(issues.flatMap((iss) => iss.expected))),
        ),
    ),
    ...arrayAgg(
      issues.filter((issue) => issue instanceof IssueInvalidValue),
      (a, b) => comparePropertyPaths(a.path, b.path),
      (issues) =>
        new IssueInvalidValue(
          issues[0].path,
          issues[0].input,
          Array.from(new Set(issues.flatMap((iss) => iss.values))),
        ),
    ),
    ...issues.filter(
      (issue) =>
        !(issue instanceof IssueInvalidType) &&
        !(issue instanceof IssueInvalidValue),
    ),
  ];
}

function comparePropertyPaths(
  a: readonly PropertyKey[],
  b: readonly PropertyKey[],
) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
