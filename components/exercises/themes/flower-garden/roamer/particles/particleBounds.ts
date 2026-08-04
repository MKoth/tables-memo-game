import type { SpeciesParticleConfig } from './particleConfig';

export const DUST_RECT_MARGIN = 4;

export const DUST_RECT_SPEED_SMOOTHING = 0.08;

export function computeDustRectHalfExtent(
  cfg: SpeciesParticleConfig,
  speed: number,
  margin?: number,
): number {
  'worklet';
  const m = margin ?? DUST_RECT_MARGIN;
  const trailReach = speed * (cfg.ttlMax / 1000);
  const driftReach = cfg.driftSpeed * (cfg.ttlMax / 1000);
  const maxRadius = cfg.startDiameterMax / 2;
  return trailReach + driftReach + maxRadius + m;
}

export function smoothDustRectSpeed(
  previous: number,
  current: number,
  smoothing?: number,
): number {
  'worklet';
  const k = smoothing ?? DUST_RECT_SPEED_SMOOTHING;
  return previous + (current - previous) * k;
}

export function anyLiveDustRect(alive: number[]): boolean {
  'worklet';
  for (let i = 0; i < alive.length; i++) {
    if (alive[i] === 1) {
      return true;
    }
  }
  return false;
}
