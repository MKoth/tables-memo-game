export function findRoamerIndexAtTap(
  tapX: number,
  tapY: number,
  positions: number[],
  count: number,
  hitRadius: number,
): number {
  'worklet';
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < count; i++) {
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
