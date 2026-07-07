export function findSentenceSlotAtTap(
  tapX: number,
  tapY: number,
  xs: number[],
  ys: number[],
  bellSizes: number[],
): number {
  'worklet';
  let bestIndex = -1;
  let bestDistSq = Number.POSITIVE_INFINITY;

  for (let index = 0; index < xs.length; index++) {
    const dx = tapX - (xs[index] ?? 0);
    const dy = tapY - (ys[index] ?? 0);
    const radius = (bellSizes[index] ?? 0) * 0.55;
    const distSq = dx * dx + dy * dy;
    if (distSq <= radius * radius && distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIndex = index;
    }
  }

  return bestIndex;
}
