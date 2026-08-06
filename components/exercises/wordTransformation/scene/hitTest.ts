export type SceneHitTarget =
  | {
      kind: 'letter';
      position: number;
      centerX: number;
      centerY: number;
      diameter: number;
    }
  | {
      kind: 'picker';
      id: string;
      centerX: number;
      centerY: number;
      diameter: number;
    };

/**
 * Pure, worklet-safe hit test: nearest target whose circle contains the point.
 * Used by the theme's tap gesture (UI thread) and unit-tested on the JS side.
 */
export function pickSceneHitTarget(
  x: number,
  y: number,
  targets: readonly SceneHitTarget[],
): SceneHitTarget | null {
  'worklet';
  let best: SceneHitTarget | null = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    const dx = x - target.centerX;
    const dy = y - target.centerY;
    const distanceSq = dx * dx + dy * dy;
    const radius = target.diameter * 0.5;
    if (distanceSq <= radius * radius && distanceSq < bestDistanceSq) {
      best = target;
      bestDistanceSq = distanceSq;
    }
  }
  return best;
}
