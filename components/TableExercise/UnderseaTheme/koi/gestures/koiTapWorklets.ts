export function findKoiIndexAtTap(
  tapX: number,
  tapY: number,
  positions: number[],
  count: number,
  hitRadius: number,
  eliminated: number[],
): number {
  'worklet';
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < count; i++) {
    let isEliminated = false;
    for (let e = 0; e < eliminated.length; e++) {
      if (eliminated[e] === i) {
        isEliminated = true;
        break;
      }
    }
    if (isEliminated) {
      continue;
    }
    const cx = positions[i * 2] ?? 0;
    const cy = positions[i * 2 + 1] ?? 0;
    const dist = Math.hypot(tapX - cx, tapY - cy);
    if (dist <= hitRadius && dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}
