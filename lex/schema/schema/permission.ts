import type { Params } from "./_parameters.ts";

export type PermissionOptions = Params;

export class Permission<
  const Resource extends string = string,
  const Options extends PermissionOptions = PermissionOptions,
> {
  readonly lexiconType = "permission" as const;

  constructor(
    readonly resource: Resource,
    readonly options: Options,
  ) {}
}
