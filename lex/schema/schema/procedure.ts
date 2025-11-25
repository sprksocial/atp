import type { Nsid } from "../core.ts";
import type { Infer } from "../validation.ts";
import type { ParamsSchema } from "./params.ts";
import type { InferPayloadBody, Payload } from "./payload.ts";

export type InferProcedureParameters<Q extends Procedure> = Q extends
  Procedure<Nsid, infer P extends ParamsSchema> ? Infer<P> : never;

export type InferProcedureInputBody<Q extends Procedure> = Q extends
  Procedure<Nsid, ParamsSchema, infer I extends Payload> ? InferPayloadBody<I>
  : never;

export type InferProcedureOutputBody<Q extends Procedure> = Q extends
  Procedure<Nsid, ParamsSchema, Payload, infer O extends Payload>
  ? InferPayloadBody<O>
  : never;

export class Procedure<
  N extends Nsid = Nsid,
  P extends ParamsSchema = ParamsSchema,
  I extends Payload = Payload,
  O extends Payload = Payload,
  E extends undefined | readonly string[] = undefined,
> {
  readonly lexiconType = "procedure" as const;

  constructor(
    readonly nsid: N,
    readonly parameters: P,
    readonly input: I,
    readonly output: O,
    readonly errors: E,
  ) {}
}
