import { NSID } from "@atp/syntax";

class MappedSet<K, I> {
  readonly #set = new Set<I>();

  constructor(
    private readonly encodeValue: (val: K) => I,
    private readonly decodeValue: (enc: I) => K,
  ) {}

  get size(): number {
    return this.#set.size;
  }

  clear(): void {
    this.#set.clear();
  }

  add(val: K): this {
    this.#set.add(this.encodeValue(val));
    return this;
  }

  has(val: K): boolean {
    return this.#set.has(this.encodeValue(val));
  }

  delete(val: K): boolean {
    return this.#set.delete(this.encodeValue(val));
  }

  *values(): IterableIterator<K> {
    for (const val of this.#set.values()) {
      yield this.decodeValue(val);
    }
  }

  keys(): IterableIterator<K> {
    return this.values();
  }

  *entries(): IterableIterator<[K, K]> {
    for (const value of this) {
      yield [value, value];
    }
  }

  forEach(
    callbackfn: (value: K, value2: K, set: MappedSet<K, I>) => void,
    thisArg?: unknown,
  ): void {
    for (const value of this) {
      callbackfn.call(thisArg, value, value, this);
    }
  }

  [Symbol.iterator](): IterableIterator<K> {
    return this.values();
  }

  readonly [Symbol.toStringTag] = "MappedSet";
}

export class NsidSet extends MappedSet<NSID, string> {
  constructor() {
    super(
      (val) => val.toString(),
      (enc) => NSID.from(enc),
    );
  }
}
