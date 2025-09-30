import type { DidDocument } from "../../types.ts";

interface DidStore {
  put(key: string, val: string): void;
  del(key: string): void;
  get(key: string): string;
}

class MemoryStore implements DidStore {
  private store: Record<string, string> = {};

  put(key: string, val: string): void {
    this.store[key] = val;
  }

  del(key: string): void {
    this.assertHas(key);
    delete this.store[key];
  }

  get(key: string): string {
    this.assertHas(key);
    return this.store[key];
  }

  assertHas(key: string): void {
    if (!this.store[key]) {
      throw new Error(`No object with key: ${key}`);
    }
  }
}

export class DidWebDb {
  constructor(private store: DidStore) {}

  static memory(): DidWebDb {
    const store = new MemoryStore();
    return new DidWebDb(store);
  }

  put(didPath: string, didDoc: DidDocument): void {
    this.store.put(didPath, JSON.stringify(didDoc));
  }

  get(didPath: string): DidDocument | null {
    try {
      const got = this.store.get(didPath);
      return JSON.parse(got);
    } catch (err) {
      console.log(`Could not get did with path ${didPath}: ${err}`);
      return null;
    }
  }

  has(didPath: string): boolean {
    const got = this.get(didPath);
    return got !== null;
  }

  del(didPath: string): void {
    this.store.del(didPath);
  }
}
