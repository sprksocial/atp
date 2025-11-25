import { assertEquals } from "@std/assert";
import { arrayAgg } from "../util/array-agg.ts";

Deno.test("arrayAgg aggregates items based on comparison and aggregation functions", () => {
  const input = [1, 1, 2, 2, 3, 3, 3];
  const result = arrayAgg(
    input,
    (a, b) => a === b,
    (items) => ({ value: items[0], count: items.length }),
  );
  assertEquals(result, [
    { value: 1, count: 2 },
    { value: 2, count: 2 },
    { value: 3, count: 3 },
  ]);
});

Deno.test("arrayAgg returns an empty array when input is empty", () => {
  const input: number[] = [];
  const result = arrayAgg(
    input,
    (a, b) => a === b,
    (items) => ({ value: items[0], count: items.length }),
  );
  assertEquals(result, []);
});

Deno.test("arrayAgg handles non-consecutive grouping", () => {
  const input = [1, 2, 1, 2, 3, 1];
  const result = arrayAgg(
    input,
    (a, b) => a === b,
    (items) => ({ value: items[0], count: items.length }),
  );
  assertEquals(result, [
    { value: 1, count: 3 },
    { value: 2, count: 2 },
    { value: 3, count: 1 },
  ]);
});
