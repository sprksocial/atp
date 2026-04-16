import { NSID } from "@atp/syntax";

class MappedMap<K, V, I> {
  readonly #map = new Map<I, V>();

  constructor(
    private readonly encodeKey: (key: K) => I,
    private readonly decodeKey: (enc: I) => K,
  ) {}

  get size(): number {
    return this.#map.size;
  }

  clear(): void {
    this.#map.clear();
  }

  set(key: K, value: V): this {
    this.#map.set(this.encodeKey(key), value);
    return this;
  }

  get(key: K): V | undefined {
    return this.#map.get(this.encodeKey(key));
  }

  has(key: K): boolean {
    return this.#map.has(this.encodeKey(key));
  }

  delete(key: K): boolean {
    return this.#map.delete(this.encodeKey(key));
  }

  values(): IterableIterator<V> {
    return this.#map.values();
  }

  *keys(): IterableIterator<K> {
    for (const key of this.#map.keys()) {
      yield this.decodeKey(key);
    }
  }

  *entries(): IterableIterator<[K, V]> {
    for (const [key, value] of this.#map.entries()) {
      yield [this.decodeKey(key), value];
    }
  }

  forEach(
    callbackfn: (value: V, key: K, map: MappedMap<K, V, I>) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of this) {
      callbackfn.call(thisArg, value, key, this);
    }
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  readonly [Symbol.toStringTag] = "MappedMap";
}

export class NsidMap<T> extends MappedMap<NSID, T, string> {
  constructor() {
    super(
      (key) => key.toString(),
      (enc) => NSID.from(enc),
    );
  }
}
