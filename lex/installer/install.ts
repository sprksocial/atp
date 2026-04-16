import { LexInstaller } from "./lex-installer.ts";
import { isEnoentError, readJsonFile } from "./fs.ts";
import { LexInstallerError } from "./lex-installer-error.ts";
import {
  type LexiconsManifest,
  lexiconsManifestSchema,
} from "./lexicons-manifest.ts";
import type { LexInstallerOptions } from "./lex-installer.ts";

export interface LexInstallOptions extends LexInstallerOptions {
  add?: string[];
  save?: boolean;
  ci?: boolean;
}

export async function install(options: LexInstallOptions): Promise<void> {
  const manifest = await readJsonFile(options.manifest).then(
    (json) => lexiconsManifestSchema.parse(json) as LexiconsManifest,
    (cause: unknown) => {
      if (isEnoentError(cause)) return undefined;
      throw new LexInstallerError("Failed to read lexicons manifest", {
        cause,
      });
    },
  );

  const installer = new LexInstaller(options);
  try {
    await installer.install({
      additions: new Set(options.add ?? []),
      manifest,
      write: !options.ci,
    });

    if (options.ci) {
      if (!manifest || !installer.equals(manifest)) {
        throw new LexInstallerError("Lexicons manifest is out of date");
      }
    } else if (options.save) {
      await installer.save();
    }
  } finally {
    await installer[Symbol.asyncDispose]();
  }
}
