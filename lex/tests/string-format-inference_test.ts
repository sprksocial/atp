import { l } from "../mod.ts";

Deno.test("string format inference for cid matches branded type", () => {
  const schema = l.string({ format: "cid" });
  type Output = l.Infer<typeof schema>;
  const value = null as unknown as Output;
  const _: l.CidString = value;
});
