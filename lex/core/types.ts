export type UnknownString = string & NonNullable<unknown>;

export type Simplify<T> = { [K in keyof T]: T[K] } & NonNullable<unknown>;

declare const __restricted: unique symbol;
export type Restricted<Message extends string> = typeof __restricted & {
  [__restricted]: Message;
};

export type WithOptionalProperties<P> = Simplify<
  & {
    -readonly [K in keyof P as undefined extends P[K] ? never : K]-?: P[K];
  }
  & {
    -readonly [K in keyof P as undefined extends P[K] ? K : never]?: P[K];
  }
>;
