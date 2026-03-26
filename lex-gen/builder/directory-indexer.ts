import { join } from "node:path";
import {
  type LexiconDocument,
  lexiconDocumentSchema,
  LexiconIterableIndexer,
} from "@atp/lex/document";

export type LexiconDirectoryIndexerOptions = {
  lexicons: string;
  ignoreInvalidLexicons?: boolean;
};

export class LexiconDirectoryIndexer extends LexiconIterableIndexer {
  constructor(options: LexiconDirectoryIndexerOptions) {
    super(readLexicons(options));
  }
}

async function* readLexicons(
  options: LexiconDirectoryIndexerOptions,
): AsyncGenerator<LexiconDocument, void, unknown> {
  for await (const filePath of listFiles(options.lexicons)) {
    if (filePath.endsWith(".json")) {
      try {
        const data = await Deno.readTextFile(filePath);
        yield lexiconDocumentSchema.parse(JSON.parse(data));
      } catch (cause) {
        const message = `Error parsing lexicon document ${filePath}`;
        if (options.ignoreInvalidLexicons) console.error(`${message}:`, cause);
        else throw new Error(message, { cause });
      }
    }
  }
}

async function* listFiles(dir: string): AsyncGenerator<string> {
  let entries: Deno.DirEntry[];
  try {
    entries = [];
    for await (const entry of Deno.readDir(dir)) {
      entries.push(entry);
    }
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return;
    throw err;
  }
  for (const entry of entries) {
    const res = join(dir, entry.name);
    if (entry.isDirectory) {
      yield* listFiles(res);
    } else if (entry.isFile || entry.isSymlink) {
      yield res;
    }
  }
}
