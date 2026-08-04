import type { RoamerSpecies } from '../../core/types';
import {
  anyLiveDustRect,
  computeDustRectHalfExtent,
  DUST_RECT_HALF_EXTENT,
  DUST_RECT_MARGIN,
} from '../particleBounds';
import { SPECIES_PARTICLE_CONFIGS } from '../particleConfig';
import type { SpeciesParticleConfig } from '../particleConfig';

function makeSpeciesConfig(
  overrides?: Partial<SpeciesParticleConfig>,
): SpeciesParticleConfig {
  return {
    emitIntervalMs: 10,
    ttlMin: 500,
    ttlMax: 1000,
    startDiameterMin: 4,
    startDiameterMax: 8,
    endDiameterMin: 1,
    endDiameterMax: 2,
    fadeInFraction: 0.5,
    fadeOutFraction: 0.3,
    colors: [[1.0, 0.894, 0.71]],
    colorChangeIntervalMs: 0,
    driftSpeed: 10,
    deviationRad: 1,
    ...overrides,
  };
}

describe('particleBounds', () => {
  describe('computeDustRectHalfExtent', () => {
    it('covers drift reach, max particle radius, and margin', () => {
      const cfg = makeSpeciesConfig({ driftSpeed: 50, ttlMax: 2000, startDiameterMax: 10 });
      const margin = 6;
      const expected = 50 * 2 + 10 / 2 + margin;
      expect(computeDustRectHalfExtent(cfg, margin)).toBeCloseTo(expected, 6);
    });

    it('is at least the margin when there is no drift and no radius', () => {
      const cfg = makeSpeciesConfig({ driftSpeed: 0, ttlMax: 0, startDiameterMax: 0 });
      expect(computeDustRectHalfExtent(cfg, DUST_RECT_MARGIN)).toBe(DUST_RECT_MARGIN);
    });

    it('uses the default margin when omitted', () => {
      const cfg = makeSpeciesConfig({ driftSpeed: 0, ttlMax: 0, startDiameterMax: 0 });
      expect(computeDustRectHalfExtent(cfg)).toBe(DUST_RECT_MARGIN);
    });
  });

  describe('anyLiveDustRect', () => {
    it('is false for an empty or all-dead flag list', () => {
      expect(anyLiveDustRect([])).toBe(false);
      expect(anyLiveDustRect([0, 0, 0])).toBe(false);
    });

    it('is true when any rect is live', () => {
      expect(anyLiveDustRect([0, 1, 0])).toBe(true);
    });
  });

  describe('DUST_RECT_HALF_EXTENT', () => {
    it('matches computeDustRectHalfExtent for every species in the real config', () => {
      const species: RoamerSpecies[] = ['butterfly', 'bee', 'bumblebee'];
      for (const s of species) {
        expect(DUST_RECT_HALF_EXTENT[s]).toBe(
          computeDustRectHalfExtent(SPECIES_PARTICLE_CONFIGS[s]),
        );
      }
    });

    it('stays well below the screen width (single small rect per roamer)', () => {
      const species: RoamerSpecies[] = ['butterfly', 'bee', 'bumblebee'];
      for (const s of species) {
        expect(DUST_RECT_HALF_EXTENT[s]).toBeLessThan(60);
      }
    });
  });
});
