import type { RoamerSpecies } from '../core/types';
import type { SpeciesParticleConfig } from './particleConfig';
import { FALL_SPEED, SPECIES_PARTICLE_CONFIGS } from './particleConfig';

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
  startRadius: number;
  endRadius: number;
  fadeInFraction: number;
  fadeOutFraction: number;
  speciesIndex: number;
  colorIndex: number;
  lastColorChangeMs: number;
  colorChangeIntervalMs: number;
  vx: number;
  vy: number;
};

export type RoamerParticleConfig = {
  fallSpeed: number;
  species: Record<RoamerSpecies, SpeciesParticleConfig>;
};

export const DEFAULT_PARTICLE_CONFIG: RoamerParticleConfig = {
  fallSpeed: FALL_SPEED,
  species: SPECIES_PARTICLE_CONFIGS,
};

export type RoamerParticleState = {
  x: number;
  y: number;
  angle: number;
  flightState: number;
  species: RoamerSpecies;
};
