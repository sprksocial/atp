import type { Permission } from "./permission.ts";

export type PermissionSetOptions = {
  title?: string;
  "title:lang"?: Record<string, undefined | string>;
  detail?: string;
  "detail:lang"?: Record<string, undefined | string>;
};

export class PermissionSet<
  const Nsid extends string = string,
  const Permissions extends readonly Permission[] = readonly Permission[],
  const Options extends PermissionSetOptions = PermissionSetOptions,
> {
  readonly lexiconType = "permission-set" as const;

  constructor(
    readonly nsid: Nsid,
    readonly permissions: Permissions,
    readonly options: Options,
  ) {}
}
