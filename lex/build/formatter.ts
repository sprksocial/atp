import { readFile } from "node:fs/promises";
import { createFromBuffer } from "@dprint/formatter";
import * as typescriptPlugin from "@dprint/typescript";

type DprintFormatter = ReturnType<typeof createFromBuffer>;

let formatterPromise: Promise<DprintFormatter> | undefined;

export class GeneratedTextFormatError extends Error {
  constructor(readonly filePath: string, cause: unknown) {
    super(
      `Failed to format generated TypeScript file ${filePath}: ${
        describeError(cause)
      }`,
      { cause },
    );
    this.name = "GeneratedTextFormatError";
  }
}

export async function formatGeneratedText(
  filePath: string,
  text: string,
): Promise<string> {
  try {
    const formatter = await getFormatter();
    return formatter.formatText({
      filePath,
      fileText: text,
    });
  } catch (err) {
    throw new GeneratedTextFormatError(filePath, err);
  }
}

async function getFormatter(): Promise<DprintFormatter> {
  if (!formatterPromise) {
    formatterPromise = loadFormatter();
  }

  return await formatterPromise;
}

async function loadFormatter(): Promise<DprintFormatter> {
  const formatter = createFromBuffer(await loadTypescriptPluginBuffer());
  formatter.setConfig({
    indentWidth: 2,
    lineWidth: 80,
    newLineKind: "lf",
    useTabs: false,
  }, {});
  return formatter;
}

async function loadTypescriptPluginBuffer(): Promise<BufferSource> {
  const plugin = typescriptPlugin as Record<string, unknown>;
  const getBuffer = plugin.getBuffer;
  if (typeof getBuffer === "function") {
    return toBufferSource(getBuffer());
  }

  const getPath = plugin.getPath;
  if (typeof getPath !== "function") {
    throw new TypeError("Could not load @dprint/typescript plugin");
  }

  return toBufferSource(await readFile(getPath() as string));
}

function toBufferSource(value: unknown): BufferSource {
  if (value instanceof ArrayBuffer) {
    return value;
  }

  if (ArrayBuffer.isView(value)) {
    const buffer = new Uint8Array(value.byteLength);
    buffer.set(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
    );
    return buffer.buffer;
  }

  throw new TypeError("Could not load @dprint/typescript plugin");
}

function describeError(err: unknown): string {
  if (err instanceof Error && err.message.length > 0) {
    return err.message;
  }

  if (typeof err === "string" && err.length > 0) {
    return err;
  }

  return String(err);
}
