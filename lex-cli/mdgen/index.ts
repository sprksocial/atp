import { readFileSync } from "@std/fs/unstable-read-file";
import { writeFileSync } from "@std/fs/unstable-write-file";
import type { LexiconDoc } from "@atproto/lexicon";

const INSERT_START = [
  "<!-- START lex generated content. Please keep comment here to allow auto update -->",
  "<!-- DON'T EDIT THIS SECTION! INSTEAD RE-RUN lex TO UPDATE -->",
];
const INSERT_END = [
  "<!-- END lex generated TOC please keep comment here to allow auto update -->",
];

export async function process(outFilePath: string, lexicons: LexiconDoc[]) {
  let existingContent = "";
  try {
    existingContent = new TextDecoder().decode(readFileSync(outFilePath));
  } catch {
    // ignore - no existing content
  }
  const fileLines: StringTree = existingContent.split("\n");

  // find previously generated content
  let startIndex = fileLines.findIndex((line) => matchesStart(line as string));
  let endIndex = fileLines.findIndex((line) => matchesEnd(line as string));
  if (startIndex === -1) {
    startIndex = fileLines.length;
  }
  if (endIndex === -1) {
    endIndex = fileLines.length;
  }

  // generate & insert content
  fileLines.splice(startIndex, endIndex - startIndex + 1, [
    INSERT_START,
    await genMdLines(lexicons),
    INSERT_END,
  ]);

  writeFileSync(outFilePath, new TextEncoder().encode(merge(fileLines)));
}

function genMdLines(lexicons: LexiconDoc[]): StringTree {
  const doc: StringTree = [];
  for (const lexicon of lexicons) {
    console.log(lexicon.id);
    const desc: StringTree = [];
    if (lexicon.description) {
      desc.push(lexicon.description, ``);
    }
    doc.push([
      `---`,
      ``,
      `## ${lexicon.id}`,
      "",
      desc,
      "```json",
      JSON.stringify(lexicon, null, 2),
      "```",
    ]);
  }
  return doc;
}

type StringTree = (StringTree | string | undefined)[];
function merge(arr: StringTree): string {
  return arr
    .flat(10)
    .filter((v) => typeof v === "string")
    .join("\n");
}

function matchesStart(line: string) {
  return /<!-- START lex /.test(line);
}

function matchesEnd(line: string) {
  return /<!-- END lex /.test(line);
}
