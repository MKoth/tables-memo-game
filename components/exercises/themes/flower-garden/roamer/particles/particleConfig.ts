import type { RoamerSpecies } from '../core/types';

export const PARTICLE_Z = 1.5;

export const MAX_PARTICLES = 120;

export const FALL_SPEED = 0;

export type SpeciesParticleConfig = {
  emitIntervalMs: number;
  ttlMin: number;
  ttlMax: number;
  startDiameterMin: number;
  startDiameterMax: number;
  endDiameterMin: number;
  endDiameterMax: number;
  fadeInFraction: number;
  fadeOutFraction: number;
  colors: [number, number, number][];
  /** Interval in ms between instant color switches through the colors array
   * in round-robin order. 0 = no cycling (uses first color only). */
  colorChangeIntervalMs: number;
  /** Horizontal drift speed in px/s, applied opposite to the insect's facing
   * direction at emission time. 0 = no drift. */
  driftSpeed: number;
  /** Random angular deviation in radians applied to each particle's drift
   * direction at emission. 0 = no spread. */
  deviationRad: number;
};

export const SPECIES_PARTICLE_CONFIGS: Record<RoamerSpecies, SpeciesParticleConfig> = {
  butterfly: {
    emitIntervalMs: 12,
    ttlMin: 900,
    ttlMax: 1500,
    startDiameterMin: 3,
    startDiameterMax: 6,
    endDiameterMin: 1,
    endDiameterMax: 2,
    fadeInFraction: 0.15,
    fadeOutFraction: 0.55,
    colors: [
      [0.92, 0.98, 1.00], // icy white
      [0.78, 0.92, 1.00], // pale sky blue
      [0.72, 0.84, 1.00], // periwinkle
      [0.88, 0.82, 1.00], // lavender
      [1.00, 0.95, 1.00], // pearl
    ],
    colorChangeIntervalMs: 80,
    driftSpeed: 4,
    deviationRad: 6.9,
  },
  bee: {
    emitIntervalMs: 10,
    ttlMin: 500,
    ttlMax: 900,
    startDiameterMin: 5,
    startDiameterMax: 10,
    endDiameterMin: 1,
    endDiameterMax: 2,
    fadeInFraction: 0.5,
    fadeOutFraction: 0.3,
    colors: [
      [1.00, 0.98, 0.88], // warm white
      [1.00, 0.93, 0.60], // pale gold
      [1.00, 0.82, 0.20], // golden
      [1.00, 0.68, 0.08], // amber
      [1.00, 0.95, 0.75], // champagne
    ],
    colorChangeIntervalMs: 30,
    driftSpeed: 15,
    deviationRad: 9.8,
  },
  bumblebee: {
    emitIntervalMs: 10,
    ttlMin: 700,
    ttlMax: 1100,
    startDiameterMin: 8,
    startDiameterMax: 12,
    endDiameterMin: 3,
    endDiameterMax: 5,
    fadeInFraction: 0.7,
    fadeOutFraction: 0.3,
    colors: [
      [1.00, 0.96, 0.82], // cream
      [0.98, 0.84, 0.36], // pollen
      [0.90, 0.67, 0.20], // honey
      [0.78, 0.55, 0.16], // ochre
      [0.95, 0.88, 0.62], // dusty gold
    ],
    colorChangeIntervalMs: 60,
    driftSpeed: 11,
    deviationRad: 19.8,
  },
};
