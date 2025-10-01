import { wait } from "@atp/common";
import { ConsecutiveList, MemoryRunner } from "../runner/index.ts";
import { assert, assertEquals, assertFalse } from "@std/assert";

Deno.test("ConsecutiveList tracks consecutive complete items.", () => {
  const consecutive = new ConsecutiveList<number>();
  // add items
  const item1 = consecutive.push(1);
  const item2 = consecutive.push(2);
  const item3 = consecutive.push(3);
  assertFalse(item1.isComplete);
  assertFalse(item2.isComplete);
  assertFalse(item3.isComplete);
  // complete items out of order
  assertEquals(consecutive.list.length, 3);
  assertEquals(item2.complete(), []);
  assert(item2.isComplete);
  assertEquals(consecutive.list.length, 3);
  assertEquals(item1.complete(), [1, 2]);
  assert(item1.isComplete);
  assertEquals(consecutive.list.length, 1);
  assertEquals(item3.complete(), [3]);
  assertEquals(consecutive.list.length, 0);
  assert(item3.isComplete);
});

Deno.test("MemoryRunner performs work in parallel across partitions, serial within a partition.", async () => {
  const runner = new MemoryRunner({ concurrency: Infinity });
  const complete: number[] = [];
  // partition 1 items start slow but get faster: slow should still complete first.
  runner.addTask("1", async () => {
    await wait(8);
    complete.push(11);
  });
  runner.addTask("1", async () => {
    await wait(4);
    complete.push(12);
  });
  runner.addTask("1", async () => {
    await wait(0);
    complete.push(13);
  });
  assertEquals(runner.partitions.size, 1);
  // partition 2 items complete quickly except the last, which is slowest of all events.
  runner.addTask("2", async () => {
    await wait(0);
    complete.push(21);
  });
  runner.addTask("2", async () => {
    await wait(1);
    complete.push(22);
  });
  runner.addTask("2", async () => {
    await wait(1);
    complete.push(23);
  });
  runner.addTask("2", async () => {
    await wait(10);
    complete.push(24);
  });
  assertEquals(runner.partitions.size, 2);
  await runner.mainQueue.onIdle();
  assertEquals(complete, [21, 22, 23, 11, 12, 13, 24]);
  assertEquals(runner.partitions.size, 0);
});

Deno.test("MemoryRunner limits overall concurrency.", async () => {
  const runner = new MemoryRunner({ concurrency: 1 });
  const complete: number[] = [];
  // if concurrency were not constrained, partition 1 would complete all items
  // before any items from partition 2. since it is constrained, the work is complete in the order added.
  runner.addTask("1", async () => {
    await wait(0);
    complete.push(11);
  });
  runner.addTask("2", async () => {
    await wait(2);
    complete.push(21);
  });
  runner.addTask("1", async () => {
    await wait(1);
    complete.push(12);
  });
  runner.addTask("2", async () => {
    await wait(5);
    complete.push(22);
  });
  // only partition 1 exists so far due to the concurrency
  assertEquals(runner.partitions.size, 1);
  await runner.mainQueue.onIdle();
  assertEquals(complete, [11, 21, 12, 22]);
  assertEquals(runner.partitions.size, 0);
});

Deno.test("MemoryRunner settles with many items.", async () => {
  const runner = new MemoryRunner({ concurrency: 100 });
  const complete: { partition: string; id: number }[] = [];
  const partitions = new Set<string>();
  for (let i = 0; i < 500; ++i) {
    const partition = Math.floor(Math.random() * 16).toString(10);
    partitions.add(partition);
    runner.addTask(partition, async () => {
      await wait((i % 2) * 2);
      complete.push({ partition, id: i });
    });
  }
  assertEquals(runner.partitions.size, partitions.size);
  await runner.mainQueue.onIdle();
  assertEquals(complete.length, 500);
  for (const partition of partitions) {
    const ids = complete
      .filter((item) => item.partition === partition)
      .map((item) => item.id);
    assertEquals(ids, [...ids].sort((a, b) => a - b));
  }
  assertEquals(runner.partitions.size, 0);
});
