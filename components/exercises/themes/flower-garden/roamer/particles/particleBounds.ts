import type { RoamerSpecies } from '../core/types';
import type { SpeciesParticleConfig } from './particleConfig';
import { SPECIES_PARTICLE_CONFIGS } from './particleConfig';

export const DUST_RECT_MARGIN = 4;

export function computeDustRectHalfExtent(
  cfg: SpeciesParticleConfig,
  margin: number = DUST_RECT_MARGIN,
): number {
  const driftReach = cfg.driftSpeed * (cfg.ttlMax / 1000);
  const maxRadius = cfg.startDiameterMax / 2;
  return driftReach + maxRadius + margin;
}

export const DUST_RECT_HALF_EXTENT: Record<RoamerSpecies, number> = {
  butterfly: computeDustRectHalfExtent(SPECIES_PARTICLE_CONFIGS.butterfly),
  bee: computeDustRectHalfExtent(SPECIES_PARTICLE_CONFIGS.bee),
  bumblebee: computeDustRectHalfExtent(SPECIES_PARTICLE_CONFIGS.bumblebee),
};

export function anyLiveDustRect(alive: number[]): boolean {
  'worklet';
  for (let i = 0; i < alive.length; i++) {
    if (alive[i] === 1) {
      return true;
    }
  }
  return false;
}
