import { assertEquals } from "@std/assert";
import { l } from "../mod.ts";

Deno.test("enum schema uses default when input is undefined", () => {
  const schema = l.enum(["asc", "desc"] as const, { default: "desc" });
  const value = schema.parse(undefined);
  assertEquals(value, "desc");
});

Deno.test("literal schema uses default when input is undefined", () => {
  const schema = l.literal("desc", { default: "desc" });
  const value = schema.parse(undefined);
  assertEquals(value, "desc");
});
