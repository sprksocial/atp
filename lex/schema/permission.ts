import type { Params } from "./_parameters.ts";

export type PermissionOptions = Params;

export class Permission<
  const Resource extends string = any,
  const Options extends PermissionOptions = any,
> {
  constructor(
    readonly resource: Resource,
    readonly options: Options,
  ) {}
}
