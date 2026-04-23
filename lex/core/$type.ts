import type { OmitKey, Simplify } from "./types.ts";
import type { NsidString } from "./string-format.ts";

export type $Type<
  N extends NsidString = NsidString,
  H extends string = string,
> = N extends NsidString ? string extends H ? N | `${N}#${string}`
  : H extends "main" ? N
  : `${N}#${H}`
  : never;

export type $TypeOf<O extends { $type?: string }> = NonNullable<O["$type"]>;

export function $type<N extends NsidString, H extends string>(
  nsid: N,
  hash: H,
): $Type<N, H> {
  return (hash === "main" ? nsid : `${nsid}#${hash}`) as $Type<N, H>;
}

export type $Typed<V, T extends string = string> = Simplify<
  V & {
    $type: T;
  }
>;

export function $typed<V extends Record<string, unknown>, T extends string>(
  value: V,
  $type: T,
): $Typed<Un$Typed<V & { $type?: unknown }>, T> {
  return (value as { $type?: unknown }).$type === $type
    ? value as unknown as $Typed<Un$Typed<V & { $type?: unknown }>, T>
    : { ...value, $type };
}

export type $TypedMaybe<V, T extends string = string> = Simplify<
  V & {
    $type?: T;
  }
>;

export type Un$Typed<V extends { $type?: unknown }> = OmitKey<V, "$type">;

declare const unknown$TypeSymbol: unique symbol;

export type Unknown$Type = string & { [unknown$TypeSymbol]: true };

export type Unknown$TypedObject = { $type: Unknown$Type };
