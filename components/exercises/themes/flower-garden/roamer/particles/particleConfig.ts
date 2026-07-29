import type { RoamerSpecies } from '../core/types';

export const PARTICLE_Z = 1.5;

export const MAX_PARTICLES = 200;

export const PARTICLE_DIAMETER_MIN = 3;
export const PARTICLE_DIAMETER_MAX = 7;

export const FALL_SPEED = 40;

export const FADE_IN_FRACTION = 0.2;
export const FADE_OUT_FRACTION = 0.3;

export type SpeciesParticleConfig = {
  emitIntervalMs: number;
  ttlMin: number;
  ttlMax: number;
  color: [number, number, number];
};

export const SPECIES_PARTICLE_CONFIGS: Record<RoamerSpecies, SpeciesParticleConfig> = {
  butterfly: {
    emitIntervalMs: 250,
    ttlMin: 1200,
    ttlMax: 2400,
    color: [1.0, 0.894, 0.71],
  },
  bee: {
    emitIntervalMs: 250,
    ttlMin: 1200,
    ttlMax: 2400,
    color: [1.0, 0.843, 0.0],
  },
  bumblebee: {
    emitIntervalMs: 250,
    ttlMin: 1200,
    ttlMax: 2400,
    color: [0.871, 0.718, 0.529],
  },
};
