import type { Infer } from "../validation.ts";
import type { ObjectSchema } from "./object.ts";
import type { ParamsSchema } from "./params.ts";
import type { RefSchema } from "./ref.ts";
import type { TypedUnionSchema } from "./typed-union.ts";

export type InferSubscriptionParameters<S extends Subscription> = S extends
  Subscription<string, infer P extends ParamsSchema> ? Infer<P>
  : never;

export type InferSubscriptionMessage<S extends Subscription> = S extends
  Subscription<
    string,
    ParamsSchema,
    infer M extends RefSchema | TypedUnionSchema | ObjectSchema
  > ? Infer<M>
  : unknown;

export class Subscription<
  N extends string = string,
  P extends ParamsSchema = ParamsSchema,
  M extends undefined | RefSchema | TypedUnionSchema | ObjectSchema = undefined,
  E extends undefined | readonly string[] = undefined,
> {
  readonly type = "subscription" as const;

  constructor(
    readonly nsid: N,
    readonly parameters: P,
    readonly message: M,
    readonly errors: E,
  ) {}
}
