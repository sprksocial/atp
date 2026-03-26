import type { Infer, Validator } from "../validation.ts";

export type LexBody<E extends string = any> = E extends `text/${string}`
  ? string
  : E extends "application/json" ? unknown
  : Uint8Array;

type InferPayloadBodyType<E extends string, B> = E extends `text/${string}`
  ? string
  : E extends "application/json" ? unknown
  : B;

export type InferPayload<P extends Payload, B = Uint8Array> = P extends
  Payload<infer E, infer S>
  ? E extends string ? S extends Validator ? { encoding: E; body: Infer<S> }
    : { encoding: E; body: InferPayloadBodyType<E, B> }
  : undefined
  : undefined;

export type InferPayloadEncoding<P extends Payload> = P extends
  Payload<infer E, any> ? E : undefined;

export type InferPayloadBody<P extends Payload, B = Uint8Array> = P extends
  Payload<any, infer S> ? S extends Validator ? Infer<S>
  : P extends Payload<infer E extends string> ? InferPayloadBodyType<E, B>
  : undefined
  : undefined;

export type PayloadOutput<
  E extends string | undefined = any,
  S extends Validator | undefined = any,
  B = Uint8Array,
> = E extends string ? S extends Validator ? { encoding: E; body: Infer<S> }
  : { encoding: E; body: InferPayloadBodyType<E, B> }
  : void;

export type PayloadBody<E extends string | undefined> = E extends undefined
  ? undefined
  : Validator | undefined;

export class Payload<
  const Encoding extends string | undefined = string | undefined,
  const Body extends PayloadBody<Encoding> = PayloadBody<Encoding>,
> {
  constructor(
    readonly encoding: Encoding,
    readonly schema: Body,
  ) {
    if (encoding === undefined && schema !== undefined) {
      throw new TypeError(
        "schema cannot be defined when encoding is undefined",
      );
    }
  }
}
