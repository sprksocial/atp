import { NSID } from "@atp/syntax";
import { parse } from "@std/jsonc";
import type { LexiconConfig } from "./types.ts";

function isValidLexiconPattern(pattern: string): boolean {
  if (pattern.endsWith(".*")) {
    try {
      NSID.parse(`${pattern.slice(0, -2)}.x`);
      return true;
    } catch {
      return false;
    }
  }
  return NSID.isValid(pattern);
}

function validateConfig(config: LexiconConfig): void {
  if (!config.outdir || config.outdir.length === 0) {
    throw new Error("outdir must not be empty");
  }

  if (!config.files || config.files.length === 0) {
    throw new Error("files must include at least one glob pattern");
  }

  for (const file of config.files) {
    if (!file || file.length === 0) {
      throw new Error("files must not contain empty strings");
    }
  }

  if (config.mappings) {
    for (const mapping of config.mappings) {
      if (!mapping.nsid || mapping.nsid.length === 0) {
        throw new Error("mappings.nsid requires at least one pattern");
      }

      for (const pattern of mapping.nsid) {
        if (!isValidLexiconPattern(pattern)) {
          throw new Error(
            `invalid NSID pattern: ${pattern} (must be valid NSID or end with .*)`,
          );
        }
      }

      if (typeof mapping.imports === "string") {
        if (mapping.imports.length === 0) {
          throw new Error("mappings.imports must not be empty");
        }
      } else if (typeof mapping.imports !== "function") {
        throw new Error("mappings.imports must be a string or function");
      }
    }
  }

  if (config.modules?.importSuffix !== undefined) {
    if (config.modules.importSuffix.length === 0) {
      throw new Error("modules.importSuffix must not be empty");
    }
  }

  if (config.pull) {
    if (!config.pull.outdir || config.pull.outdir.length === 0) {
      throw new Error("pull.outdir must not be empty");
    }

    if (!config.pull.sources || config.pull.sources.length === 0) {
      throw new Error("pull.sources must include at least one source");
    }

    for (const source of config.pull.sources) {
      if (source.type === "git") {
        if (!source.remote || source.remote.length === 0) {
          throw new Error("pull.sources[].remote must not be empty");
        }

        if (source.ref !== undefined && source.ref.length === 0) {
          throw new Error("pull.sources[].ref must not be empty");
        }

        if (!source.pattern || source.pattern.length === 0) {
          throw new Error(
            "pull.sources[].pattern must include at least one glob pattern",
          );
        }

        for (const pattern of source.pattern) {
          if (!pattern || pattern.length === 0) {
            throw new Error(
              "pull.sources[].pattern must not contain empty strings",
            );
          }
        }
      }
    }
  }
}

export function defineLexiconConfig(config: LexiconConfig): LexiconConfig {
  validateConfig(config);
  return config;
}

export async function loadLexiconConfig(
  configPath?: string,
): Promise<LexiconConfig | null> {
  if (!configPath) {
    const possiblePaths = [
      "./lexicon.config.json",
      "./lexicon.config.jsonc",
    ];
    for (const path of possiblePaths) {
      try {
        if (typeof Deno !== "undefined") {
          const stat = Deno.statSync(path);
          if (stat.isFile) {
            configPath = path;
            break;
          }
        }
      } catch {
        continue;
      }
    }
  }

  if (!configPath) {
    return null;
  }

  try {
    const content = typeof Deno !== "undefined"
      ? Deno.readTextFileSync(configPath)
      : (await import("node:fs")).readFileSync(configPath, "utf-8");
      
    const parsed = parse(content) as unknown as LexiconConfig;
    return defineLexiconConfig(parsed);
  } catch (error) {
    console.warn(`Failed to load config from ${configPath}:`, error);
    return null;
  }
}
