export function pickFieldFlowerTarget(
  freeFlowerIds: number[],
  lastFlowerIndex: number | null,
  rollValue: number,
): number | null {
  'worklet';
  const filtered =
    lastFlowerIndex != null
      ? freeFlowerIds.filter(id => id !== lastFlowerIndex)
      : freeFlowerIds;
  if (filtered.length === 0) return null;
  const idx = Math.floor(rollValue * filtered.length) % filtered.length;
  return filtered[idx]!;
}
