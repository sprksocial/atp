import { readFileSync } from "@std/fs/unstable-read-file";
import { statSync } from "@std/fs/unstable-stat";
import { mkdirSync } from "@std/fs/unstable-mkdir";
import { writeFileSync } from "@std/fs/unstable-write-file";
import { existsSync } from "@std/fs";
import { globToRegExp, join } from "@std/path";
import { removeSync } from "@std/fs/unstable-remove";
import { readDirSync } from "@std/fs/unstable-read-dir";
import { colors } from "@cliffy/ansi/colors";
import { ZodError } from "zod";
import { type LexiconDoc, parseLexiconDoc } from "@atp/lexicon";
import type { FileDiff, GeneratedAPI, LexiconConfig } from "./types.ts";
import process from "node:process";

type RecursiveZodError = {
  _errors?: string[];
  [k: string]: RecursiveZodError | string[] | undefined;
};

export function expandGlobPatterns(patterns: string[]): string[] {
  const files: string[] = [];
  const cwd = typeof Deno !== "undefined" ? Deno.cwd() : process.cwd();

  function walkDir(
    dir: string,
    relativeToCwd: string,
    regex: RegExp,
    files: string[],
  ): void {
    try {
      if (!existsSync(dir)) return;
      const entries = Array.from(readDirSync(dir));
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relToCwd = relativeToCwd
          ? join(relativeToCwd, entry.name)
          : entry.name;
        if (statSync(fullPath).isDirectory) {
          walkDir(fullPath, relToCwd, regex, files);
        } else if (entry.name.endsWith(".json")) {
          const testPath = relToCwd.startsWith("/") ? relToCwd : `/${relToCwd}`;
          if (regex.test(testPath) || regex.test(relToCwd)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // skip
    }
  }

  for (const pattern of patterns) {
    const normalizedPattern = pattern.startsWith("./")
      ? pattern.slice(2)
      : pattern;
    const regex = globToRegExp(normalizedPattern, {
      extended: true,
      globstar: true,
    });
    const basePath = normalizedPattern.split("*")[0] ||
      normalizedPattern.split("?")[0] || "";
    let searchDir = cwd;
    let relativeToCwd = "";
    if (basePath.includes("/")) {
      const lastSlashIndex = basePath.lastIndexOf("/");
      if (lastSlashIndex >= 0) {
        const baseDir = basePath.substring(0, lastSlashIndex);
        searchDir = join(cwd, baseDir);
        relativeToCwd = baseDir;
      }
    }

    walkDir(searchDir, relativeToCwd, regex, files);
  }

  return Array.from(new Set(files));
}

export function readAllLexicons(paths: string[] | string): LexiconDoc[] {
  const docs: LexiconDoc[] = [];
  const pathArray = Array.isArray(paths) ? paths : [paths];
  const expandedPaths: string[] = [];

  for (const path of pathArray) {
    if (path.includes("*") || path.includes("?")) {
      expandedPaths.push(...expandGlobPatterns([path]));
    } else {
      expandedPaths.push(path);
    }
  }

  for (const path of expandedPaths) {
    if (statSync(path).isDirectory) {
      const entries = Array.from(readDirSync(path));
      const subPaths = entries.map((entry) => join(path, entry.name));
      docs.push(...readAllLexicons(subPaths));
    } else if (path.endsWith(".json") && statSync(path).isFile) {
      try {
        docs.push(readLexicon(path));
      } catch {
        // skip
      }
    }
  }
  return docs;
}

export function readLexicon(path: string): LexiconDoc {
  let str: string;
  let obj: unknown;
  try {
    str = new TextDecoder().decode(readFileSync(path));
  } catch (e) {
    console.error(`Failed to read file`, path);
    throw e;
  }
  try {
    obj = JSON.parse(str);
  } catch (e) {
    console.error(`Failed to parse JSON in file`, path);
    throw e;
  }
  if (
    obj &&
    typeof obj === "object" &&
    typeof (obj as LexiconDoc).lexicon === "number"
  ) {
    try {
      return parseLexiconDoc(obj);
    } catch (e) {
      console.error(`Invalid lexicon`, path);
      if (e instanceof ZodError) {
        printZodError(e.format());
      }
      throw e;
    }
  } else {
    console.error(`Not lexicon schema`, path);
    throw new Error(`Not lexicon schema`);
  }
}

export function genTsObj(lexicons: LexiconDoc[]): string {
  return `export const lexicons = ${JSON.stringify(lexicons, null, 2)}`;
}

export function genFileDiff(outDir: string, api: GeneratedAPI) {
  const diffs: FileDiff[] = [];
  const existingFiles = readdirRecursiveSync(outDir);

  for (const file of api.files) {
    file.path = join(outDir, file.path);
    if (existingFiles.includes(file.path)) {
      diffs.push({ act: "mod", path: file.path, content: file.content });
    } else {
      diffs.push({ act: "add", path: file.path, content: file.content });
    }
  }
  for (const filepath of existingFiles) {
    if (api.files.find((f) => f.path === filepath)) {
      // do nothing
    } else {
      diffs.push({ act: "del", path: filepath });
    }
  }

  return diffs;
}

export function printFileDiff(diff: FileDiff[]) {
  for (const d of diff) {
    switch (d.act) {
      case "add":
        console.log(`${colors.bold.green("[+ add]")} ${d.path}`);
        break;
      case "mod":
        console.log(`${colors.bold.yellow("[* mod]")} ${d.path}`);
        break;
      case "del":
        console.log(`${colors.bold.green("[- del]")} ${d.path}`);
        break;
    }
  }
}

export function applyFileDiff(diff: FileDiff[]) {
  for (const d of diff) {
    switch (d.act) {
      case "add":
      case "mod":
        mkdirSync(join(d.path, ".."), { recursive: true }); // lazy way to make sure the parent dir exists
        writeFileSync(d.path, new TextEncoder().encode(d.content || ""));
        break;
      case "del":
        removeSync(d.path);
        break;
    }
  }
}

function isRecursiveZodError(value: unknown): value is RecursiveZodError {
  return value !== null && typeof value === "object";
}

function printZodError(node: RecursiveZodError, path = ""): boolean {
  if (node._errors?.length) {
    console.log(colors.red(`Issues at ${path}:`));
    for (const err of dedup(node._errors)) {
      console.log(colors.red(` - ${err}`));
    }
    return true;
  } else {
    for (const k in node) {
      if (k === "_errors") {
        continue;
      }
      const value = node[k];
      if (isRecursiveZodError(value)) {
        printZodError(value, `${path}/${k}`);
      }
    }
  }
  return false;
}

function readdirRecursiveSync(root: string, files: string[] = [], prefix = "") {
  const dir = join(root, prefix);
  if (!existsSync(dir)) return files;
  if (statSync(dir).isDirectory) {
    Array.from(readDirSync(dir)).forEach(function (entry) {
      readdirRecursiveSync(root, files, join(prefix, entry.name));
    });
  } else if (prefix.endsWith(".ts")) {
    files.push(join(root, prefix));
  }

  return files;
}

function dedup(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

export function shouldPullLexicons(
  config: LexiconConfig | null,
  filesProvidedViaCli: boolean,
  files: string[],
): boolean {
  if (!config?.pull) {
    return false;
  }

  if (filesProvidedViaCli) {
    return false;
  }

  const cwd = typeof Deno !== "undefined" ? Deno.cwd() : process.cwd();

  for (const filePattern of files) {
    const normalizedPattern = filePattern.startsWith("./")
      ? filePattern.slice(2)
      : filePattern;
    const filePath = normalizedPattern.startsWith("/")
      ? normalizedPattern
      : join(cwd, normalizedPattern);

    if (filePattern.includes("*") || filePattern.includes("?")) {
      const expanded = expandGlobPatterns([filePattern]);
      if (expanded.length === 0) {
        return true;
      }
      let allExist = true;
      for (const file of expanded) {
        if (!existsSync(file)) {
          allExist = false;
          break;
        }
      }
      if (!allExist) {
        return true;
      }
    } else {
      if (!existsSync(filePath)) {
        return true;
      }
    }
  }

  return false;
}
