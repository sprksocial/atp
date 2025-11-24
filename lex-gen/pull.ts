import { join } from "@std/path";
import { existsSync } from "@std/fs";
import { removeSync } from "@std/fs/unstable-remove";
import { mkdirSync } from "@std/fs/unstable-mkdir";
import { readFileSync } from "@std/fs/unstable-read-file";
import { writeFileSync } from "@std/fs/unstable-write-file";
import { readDirSync } from "@std/fs/unstable-read-dir";
import { statSync } from "@std/fs/unstable-stat";
import { globToRegExp } from "@std/path";
import process from "node:process";
import type { PullConfig } from "./types.ts";

function copyMatchingFiles(
  sourceDir: string,
  targetBase: string,
  relativePath: string,
  regex: RegExp,
): void {
  try {
    if (!existsSync(sourceDir)) return;
    const entries = Array.from(readDirSync(sourceDir));
    for (const entry of entries) {
      const sourcePath = join(sourceDir, entry.name);
      const relPath = relativePath
        ? join(relativePath, entry.name)
        : entry.name;
      const testPath = relPath.startsWith("/") ? relPath : `/${relPath}`;

      if (statSync(sourcePath).isDirectory) {
        copyMatchingFiles(sourcePath, targetBase, relPath, regex);
      } else if (entry.name.endsWith(".json")) {
        if (regex.test(testPath) || regex.test(relPath)) {
          const targetPath = join(targetBase, relPath);
          mkdirSync(join(targetPath, ".."), { recursive: true });
          const content = readFileSync(sourcePath);
          writeFileSync(targetPath, content);
        }
      }
    }
  } catch {
    // skip
  }
}

export async function pullLexicons(config: PullConfig): Promise<void> {
  const cwd = typeof Deno !== "undefined" ? Deno.cwd() : process.cwd();
  const pullDir = join(cwd, config.outdir);

  if (config.clean && existsSync(pullDir)) {
    console.log(`Cleaning ${pullDir}...`);
    removeSync(pullDir, { recursive: true });
  }

  mkdirSync(pullDir, { recursive: true });

  for (const source of config.sources) {
    if (source.type === "git") {
      await pullFromGit(source, pullDir);
    }
  }
}

export function cleanupPullDirectory(config: PullConfig): void {
  if (!config.clean) {
    return;
  }

  const cwd = typeof Deno !== "undefined" ? Deno.cwd() : process.cwd();
  const pullDir = join(cwd, config.outdir);

  if (existsSync(pullDir)) {
    try {
      removeSync(pullDir, { recursive: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

async function pullFromGit(
  source: { remote: string; ref?: string; pattern: string[] },
  targetDir: string,
): Promise<void> {
  const cwd = typeof Deno !== "undefined" ? Deno.cwd() : process.cwd();
  const tempDir = join(cwd, ".lex-gen-temp", crypto.randomUUID());

  try {
    console.log(`Cloning ${source.remote}...`);
    const cloneArgs = [
      "clone",
      "--depth",
      "1",
      "--filter=blob:none",
      "--sparse",
    ];

    if (source.ref) {
      cloneArgs.push(`--branch=${source.ref}`);
    }

    cloneArgs.push(source.remote, tempDir);

    const cloneCmd = new Deno.Command("git", {
      args: cloneArgs,
      cwd,
    });

    const cloneResult = await cloneCmd.output();
    if (!cloneResult.success) {
      const error = new TextDecoder().decode(cloneResult.stderr);
      throw new Error(`Failed to clone repository: ${error}`);
    }

    const sparseCheckoutCmd = new Deno.Command("git", {
      args: ["sparse-checkout", "set", "--no-cone", ...source.pattern],
      cwd: tempDir,
    });

    const sparseResult = await sparseCheckoutCmd.output();
    if (!sparseResult.success) {
      const error = new TextDecoder().decode(sparseResult.stderr);
      throw new Error(`Failed to set sparse checkout: ${error}`);
    }

    const checkoutCmd = new Deno.Command("git", {
      args: ["checkout"],
      cwd: tempDir,
    });

    const checkoutResult = await checkoutCmd.output();
    if (!checkoutResult.success) {
      const error = new TextDecoder().decode(checkoutResult.stderr);
      throw new Error(`Failed to checkout files: ${error}`);
    }

    for (const pattern of source.pattern) {
      const normalizedPattern = pattern.startsWith("./")
        ? pattern.slice(2)
        : pattern;
      const regex = globToRegExp(normalizedPattern, {
        extended: true,
        globstar: true,
      });

      copyMatchingFiles(tempDir, targetDir, "", regex);
    }
  } finally {
    if (existsSync(tempDir)) {
      removeSync(tempDir, { recursive: true });
    }
    const tempParent = join(cwd, ".lex-gen-temp");
    if (existsSync(tempParent)) {
      try {
        const entries = Array.from(readDirSync(tempParent));
        if (entries.length === 0) {
          removeSync(tempParent);
        }
      } catch {
        // ignore
      }
    }
  }
}
