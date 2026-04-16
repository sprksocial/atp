import { relative } from "node:path";

export function memoize<T extends (arg: string) => unknown>(fn: T): T {
  const cache = new Map<string, unknown>();
  return ((arg: string) => {
    if (cache.has(arg)) return cache.get(arg);
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  }) as T;
}

export function ucFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function lcFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function toPascalCase(str: string): string {
  return extractWords(str).map(toLowerCase).map(ucFirst).join("");
}

export function toCamelCase(str: string): string {
  return lcFirst(toPascalCase(str));
}

function toLowerCase(str: string): string {
  return str.toLowerCase();
}

function extractWords(str: string): string[] {
  const processed = str
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/([0-9])([A-Za-z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim();
  return processed ? processed.split(/\s+/) : [];
}

export function asRelativePath(from: string, to: string): string {
  const rel = relative(from, to);
  return rel.startsWith("./") || rel.startsWith("../") ? rel : `./${rel}`;
}
