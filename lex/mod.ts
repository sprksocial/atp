import * as l from "./external.ts";

export { l };
export * from "./external.ts";
export { type CidParseOptions, parseCidSafe } from "./data/cid.ts";
export * from "./json/mod.ts";

if (import.meta.main) {
  const { default: command } = await import("./cli.ts");
  void command.parse(Deno.args);
}
