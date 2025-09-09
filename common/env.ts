import { parseIntWithFallback } from "./util.ts";
import process from "node:process";

// Detect runtime environment
const isDeno = typeof Deno !== "undefined";

// Runtime-agnostic environment variable getter
const getEnvVar = (name: string): string | undefined => {
  if (isDeno) {
    return Deno.env.get(name);
  } else {
    try {
      return process?.env?.[name];
    } catch {
      return undefined;
    }
  }
};

export const envInt = (name: string): number | undefined => {
  const str = getEnvVar(name);
  return parseIntWithFallback(str, undefined);
};

export const envStr = (name: string): string | undefined => {
  const str = getEnvVar(name);
  if (str === undefined || str.length === 0) return undefined;
  return str;
};

export const envBool = (name: string): boolean | undefined => {
  const str = getEnvVar(name);
  if (str === "true" || str === "1") return true;
  if (str === "false" || str === "0") return false;
  return undefined;
};

export const envList = (name: string): string[] => {
  const str = getEnvVar(name);
  if (str === undefined || str.length === 0) return [];
  return str.split(",");
};
