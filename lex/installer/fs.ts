import { dirname } from "node:path";

export async function readJsonFile(path: string): Promise<unknown> {
  const contents = await Deno.readTextFile(path);
  return JSON.parse(contents);
}

export async function writeJsonFile(
  path: string,
  data: unknown,
): Promise<void> {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, JSON.stringify(data, null, 2));
}

export function isEnoentError(err: unknown): boolean {
  return err instanceof Deno.errors.NotFound ||
    (
      err instanceof Error &&
      "code" in err &&
      typeof err.code === "string" &&
      err.code === "ENOENT"
    );
}
