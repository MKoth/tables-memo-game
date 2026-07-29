import type { RoamerSpecies } from '../core/types';
import type { SpeciesParticleConfig } from './particleConfig';
import { FALL_SPEED, FADE_IN_FRACTION, FADE_OUT_FRACTION } from './particleConfig';
import { PARTICLE_DIAMETER_MIN, PARTICLE_DIAMETER_MAX } from './particleConfig';

export type ParticleInternal = {
  x: number;
  y: number;
  opacity: number;
  radius: number;
  r: number;
  g: number;
  b: number;
  age: number;
  ttl: number;
  active: boolean;
};

export type RoamerParticleConfig = {
  diameterMin: number;
  diameterMax: number;
  fallSpeed: number;
  fadeInFraction: number;
  fadeOutFraction: number;
  species: Record<RoamerSpecies, SpeciesParticleConfig>;
};

export const DEFAULT_PARTICLE_CONFIG: RoamerParticleConfig = {
  diameterMin: PARTICLE_DIAMETER_MIN,
  diameterMax: PARTICLE_DIAMETER_MAX,
  fallSpeed: FALL_SPEED,
  fadeInFraction: FADE_IN_FRACTION,
  fadeOutFraction: FADE_OUT_FRACTION,
  species: {
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
  },
};

export type RoamerParticleState = {
  x: number;
  y: number;
  flightState: number;
  species: RoamerSpecies;
};
