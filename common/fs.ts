import { readFile } from "@std/fs/unstable-read-file";
import { remove } from "@std/fs/unstable-remove";
import { rename } from "@std/fs/unstable-rename";

export const readIfExists = async (
  filepath: string,
): Promise<Uint8Array | undefined> => {
  try {
    return await readFile(filepath);
  } catch (err) {
    throw err;
  }
};

export const rmIfExists = async (
  filepath: string,
  recursive = false,
): Promise<void> => {
  try {
    await remove(filepath, { recursive });
  } catch (err) {
    throw err;
  }
};

export const renameIfExists = async (
  oldPath: string,
  newPath: string,
): Promise<void> => {
  try {
    await rename(oldPath, newPath);
  } catch (err) {
    throw err;
  }
};
