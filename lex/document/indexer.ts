import type { LexiconDocument } from "./lexicon.ts";

export interface LexiconIndexer {
  get(nsid: string): Promise<LexiconDocument> | LexiconDocument;
  [Symbol.asyncDispose]?: () => Promise<void>;
  [Symbol.asyncIterator]?: () => AsyncIterator<LexiconDocument, void, unknown>;
}

export class LexiconIterableIndexer implements LexiconIndexer, AsyncDisposable {
  readonly #lexicons: Map<string, LexiconDocument> = new Map();
  readonly #iterator:
    | AsyncIterator<LexiconDocument, void, unknown>
    | Iterator<LexiconDocument, void, unknown>;

  constructor(
    readonly source:
      | AsyncIterable<LexiconDocument>
      | Iterable<LexiconDocument>,
  ) {
    this.#iterator = Symbol.asyncIterator in source
      ? source[Symbol.asyncIterator]()
      : source[Symbol.iterator]();
  }

  async get(id: string): Promise<LexiconDocument> {
    const cached = this.#lexicons.get(id);
    if (cached) return cached;

    for await (const doc of this) {
      if (doc.id === id) return doc;
    }

    throw Object.assign(new Error(`Lexicon ${id} not found`), {
      code: "ENOENT",
    });
  }

  async *[Symbol.asyncIterator](): AsyncIterator<
    LexiconDocument,
    void,
    undefined
  > {
    const returned = new Set<string>();

    for (const doc of this.#lexicons.values()) {
      returned.add(doc.id);
      yield doc;
    }

    do {
      const { value, done } = await this.#iterator.next();

      if (done) break;

      if (returned.has(value.id)) {
        const err = new Error(`Duplicate lexicon document id: ${value.id}`);
        await this.#iterator.throw?.(err);
        throw err;
      }

      this.#lexicons.set(value.id, value);
      returned.add(value.id);
      yield value;
    } while (true);

    for (const doc of this.#lexicons.values()) {
      if (!returned.has(doc.id)) {
        returned.add(doc.id);
        yield doc;
      }
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#iterator.return?.();
  }
}
