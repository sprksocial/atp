import type { LexiconDocument, LexiconIndexer } from "../document/mod.ts";
import type { Filter } from "./filter.ts";

export class FilteredIndexer implements LexiconIndexer, AsyncDisposable {
  protected readonly returned: Set<string> = new Set<string>();

  constructor(
    readonly indexer: LexiconIndexer & AsyncIterable<LexiconDocument>,
    readonly filter: Filter,
  ) {}

  get(id: string): Promise<LexiconDocument> | LexiconDocument {
    this.returned.add(id);
    return this.indexer.get(id);
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<
    LexiconDocument,
    void,
    unknown
  > {
    const returned = new Set<string>();

    for await (const doc of this.indexer) {
      if (returned.has(doc.id)) {
        throw new Error(`Duplicate lexicon document id: ${doc.id}`);
      }

      if (this.returned.has(doc.id) || this.filter(doc.id)) {
        this.returned.add(doc.id);
        returned.add(doc.id);
        yield doc;
      }
    }

    let returnedAny: boolean;
    do {
      returnedAny = false;
      for (const id of this.returned) {
        if (!returned.has(id)) {
          yield await this.indexer.get(id);
          returned.add(id);
          returnedAny = true;
        }
      }
    } while (returnedAny);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.indexer[Symbol.asyncDispose]?.();
  }
}
