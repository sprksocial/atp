import type { NsidString } from "../core/string-format.ts";
import type { Permission } from "./permission.ts";

export type PermissionSetOptions = {
  title?: string;
  "title:lang"?: Record<string, undefined | string>;
  detail?: string;
  "detail:lang"?: Record<string, undefined | string>;
};

export class PermissionSet<
  const TNsid extends NsidString = any,
  const TPermissions extends readonly Permission[] = any,
> {
  constructor(
    readonly nsid: TNsid,
    readonly permissions: TPermissions,
    readonly options: PermissionSetOptions = {},
  ) {}
}
