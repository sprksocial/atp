import { randomIntFromSeed } from "../mod.ts";
import { assert, assertEquals } from "@std/assert";

Deno.test("randomIntFromSeed has good distribution for low bucket count.", () => {
  const counts: [zero: number, one: number] = [0, 0];
  const salt = Math.random();
  for (let i = 0; i < 10000; ++i) {
    const int = randomIntFromSeed(`${i}${salt}`, 2);
    counts[int]++;
  }
  const [zero, one] = counts;
  assertEquals(zero + one, 10000);
  assert(Math.max(zero, one) / Math.min(zero, one) < 1.1);
});
