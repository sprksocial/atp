export function arrayAgg<T, O>(
  arr: readonly T[],
  cmp: (a: T, b: T) => boolean,
  agg: (items: [T, ...T[]]) => O,
): O[] {
  if (arr.length === 0) return [];

  const groups: [T, ...T[]][] = [[arr[0]]];
  const skipped = Array<undefined | boolean>(arr.length);

  outer: for (let i = 1; i < arr.length; i++) {
    if (skipped[i]) continue;
    const item = arr[i];
    for (let j = 0; j < groups.length; j++) {
      if (cmp(item, groups[j][0])) {
        groups[j].push(item);
        skipped[i] = true;
        continue outer;
      }
    }
    groups.push([item]);
  }

  return groups.map(agg);
}
