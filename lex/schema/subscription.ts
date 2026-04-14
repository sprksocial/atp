import type { NsidString } from "../core/string-format.ts";
import type { Infer } from "../validation.ts";
import type { ObjectSchema } from "./object.ts";
import type { ParamsSchema } from "./params.ts";
import type { RefSchema } from "./ref.ts";
import type { TypedUnionSchema } from "./typed-union.ts";

export type InferSubscriptionParameters<S extends Subscription> = S extends
  Subscription<any, infer P extends ParamsSchema, any> ? Infer<P> : never;

export type InferSubscriptionMessage<S extends Subscription> = S extends
  Subscription<
    any,
    any,
    infer M extends RefSchema | TypedUnionSchema | ObjectSchema
  > ? Infer<M>
  : unknown;

export class Subscription<
  TNsid extends NsidString = any,
  TParameters extends ParamsSchema = any,
  TMessage extends
    | undefined
    | RefSchema
    | TypedUnionSchema
    | ObjectSchema = any,
  TErrors extends undefined | readonly string[] = any,
> {
  readonly type = "subscription" as const;

  constructor(
    readonly nsid: TNsid,
    readonly parameters: TParameters,
    readonly message: TMessage,
    readonly errors: TErrors,
  ) {}
}
