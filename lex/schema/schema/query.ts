import type { Nsid } from "../core.ts";
import type { Infer } from "../validation.ts";
import type { ParamsSchema } from "./params.ts";
import type { InferPayloadBody, Payload } from "./payload.ts";

export type InferQueryParameters<Q extends Query> = Q extends
  Query<Nsid, infer P extends ParamsSchema> ? Infer<P> : never;

export type InferQueryOutputBody<Q extends Query> = Q extends
  Query<Nsid, ParamsSchema, infer O extends Payload> ? InferPayloadBody<O>
  : never;

export class Query<
  N extends Nsid = Nsid,
  P extends ParamsSchema = ParamsSchema,
  O extends Payload = Payload,
  E extends undefined | readonly string[] = undefined,
> {
  readonly lexiconType = "query" as const;

  constructor(
    readonly nsid: N,
    readonly parameters: P,
    readonly output: O,
    readonly errors: E,
  ) {}
}
