import { FlightState } from '../../core/types';
import type { RoamerSpecies } from '../../core/types';
import {
  createEmptyParticlePool,
  updateParticlePool,
} from '../updateParticlePool';
import type { ParticleInternal, RoamerParticleConfig } from '../particleTypes';
import { FALL_SPEED } from '../particleConfig';
import type { SpeciesParticleConfig } from '../particleConfig';

function makeSpeciesConfig(
  overrides?: Partial<SpeciesParticleConfig>,
): SpeciesParticleConfig {
  return {
    emitIntervalMs: 250,
    ttlMin: 1200,
    ttlMax: 2400,
    color: [1.0, 0.894, 0.71],
    ...overrides,
  };
}

function withButterflyOverride(
  base: RoamerParticleConfig,
  overrides: Partial<SpeciesParticleConfig>,
): RoamerParticleConfig {
  return {
    ...base,
    species: {
      ...base.species,
      butterfly: { ...base.species.butterfly, ...overrides },
    },
  };
}

function allSpecies(overrides?: Partial<SpeciesParticleConfig>): Record<RoamerSpecies, SpeciesParticleConfig> {
  const base = overrides ?? {};
  return {
    butterfly: makeSpeciesConfig({ emitIntervalMs: 0, ttlMin: 1200, ttlMax: 2400, color: [1.0, 0.894, 0.71], ...base }),
    bee: makeSpeciesConfig({ emitIntervalMs: 0, ttlMin: 1200, ttlMax: 2400, color: [1.0, 0.843, 0.0], ...base }),
    bumblebee: makeSpeciesConfig({ emitIntervalMs: 0, ttlMin: 1200, ttlMax: 2400, color: [0.871, 0.718, 0.529], ...base }),
  };
}

function makeConfig(): RoamerParticleConfig {
  return {
    diameterMin: 3,
    diameterMax: 7,
    fallSpeed: 40,
    fadeInFraction: 0.2,
    fadeOutFraction: 0.3,
    species: allSpecies(),
  };
}

function roamerState(
  overrides?: Partial<{
    x: number;
    y: number;
    flightState: FlightState;
    species: RoamerSpecies;
  }>,
) {
  return {
    x: 200,
    y: 300,
    flightState: FlightState.FLYING_CRUISE,
    species: 'butterfly' as RoamerSpecies,
    ...overrides,
  };
}

function makeSeededRng(seed = 0xc0ffee): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function countActive(pool: ParticleInternal[]): number {
  return pool.filter(p => p.active).length;
}

describe('updateParticlePool', () => {
  describe('emission', () => {
    it('emits a particle from a FLYING_CRUISE roamer', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState({ flightState: FlightState.FLYING_CRUISE })];
      const timestamps: number[] = [0];
      const config = makeConfig();

      updateParticlePool(pool, states, config, 0.016, 100, timestamps, makeSeededRng());

      expect(countActive(pool)).toBe(1);
      const p = pool[0]!;
      expect(p.x).toBe(200);
      expect(p.y).toBeCloseTo(300 + FALL_SPEED * 0.016, 2);
      expect(p.active).toBe(true);
    });

    it('emits a particle from an APPROACH_FLOWER roamer', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState({ flightState: FlightState.APPROACH_FLOWER })];
      const timestamps: number[] = [0];
      const config = makeConfig();

      updateParticlePool(pool, states, config, 0.016, 100, timestamps, makeSeededRng());

      expect(countActive(pool)).toBe(1);
      const p = pool[0]!;
      expect(p.active).toBe(true);
    });

    it('does NOT emit from SITTING roamer', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState({ flightState: FlightState.SITTING })];
      const timestamps: number[] = [0];
      const config = makeConfig();

      updateParticlePool(pool, states, config, 0.016, 100, timestamps, makeSeededRng());

      expect(countActive(pool)).toBe(0);
    });

    it('does NOT emit from FLYING_IDLE roamer', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState({ flightState: FlightState.FLYING_IDLE })];
      const timestamps: number[] = [0];
      const config = makeConfig();

      updateParticlePool(pool, states, config, 0.016, 100, timestamps, makeSeededRng());

      expect(countActive(pool)).toBe(0);
    });

    it('does NOT emit from LIFTING_OFF roamer', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState({ flightState: FlightState.LIFTING_OFF })];
      const timestamps: number[] = [0];
      const config = makeConfig();

      updateParticlePool(pool, states, config, 0.016, 100, timestamps, makeSeededRng());

      expect(countActive(pool)).toBe(0);
    });
  });

  describe('emission respects interval', () => {
    it('does not emit if elapsedMs - lastEmit < emitIntervalMs', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState({ flightState: FlightState.FLYING_CRUISE })];
      const timestamps: number[] = [0];
      const config = withButterflyOverride(makeConfig(), { emitIntervalMs: 500 });

      updateParticlePool(pool, states, config, 0.016, 100, timestamps, makeSeededRng());

      expect(countActive(pool)).toBe(0);
    });

    it('emits when elapsedMs - lastEmit >= emitIntervalMs', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState({ flightState: FlightState.FLYING_CRUISE })];
      const timestamps: number[] = [0];
      const config = withButterflyOverride(makeConfig(), { emitIntervalMs: 500 });

      updateParticlePool(pool, states, config, 0.016, 600, timestamps, makeSeededRng());

      expect(countActive(pool)).toBe(1);
    });
  });

  describe('particle properties', () => {
    it('initial position matches roamer position', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState({ x: 150, y: 250 })];
      const timestamps: number[] = [0];
      const config = makeConfig();

      updateParticlePool(pool, states, config, 0.016, 100, timestamps, makeSeededRng());

      const p = pool[0]!;
      expect(p.x).toBe(150);
      expect(p.y).toBeCloseTo(250 + FALL_SPEED * 0.016, 2);
    });

    it('particle colour matches species colour from config', () => {
      const pool = createEmptyParticlePool();
      const states = [
        roamerState({ species: 'bee' }),
        roamerState({ species: 'bumblebee', x: 300, y: 400 }),
      ];
      const timestamps: number[] = [0, 0];
      const config = makeConfig();

      updateParticlePool(pool, states, config, 0.016, 100, timestamps, makeSeededRng());

      const bee = pool[0]!;
      expect(bee.r).toBe(1.0);
      expect(bee.g).toBe(0.843);
      expect(bee.b).toBe(0.0);

      const bumble = pool[1]!;
      expect(bumble.r).toBe(0.871);
      expect(bumble.g).toBe(0.718);
      expect(bumble.b).toBe(0.529);
    });

    it('particle radius is within configured range', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState()];
      const timestamps: number[] = [0];
      const config = makeConfig();

      updateParticlePool(pool, states, config, 0.016, 100, timestamps, makeSeededRng(42));

      const p = pool[0]!;
      expect(p.radius).toBeGreaterThanOrEqual(1.5);
      expect(p.radius).toBeLessThanOrEqual(3.5);
    });

    it('particle TTL is within configured range', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState()];
      const timestamps: number[] = [0];
      const config = makeConfig();

      updateParticlePool(pool, states, config, 0.016, 100, timestamps, makeSeededRng(42));

      const p = pool[0]!;
      expect(p.ttl).toBeGreaterThanOrEqual(1.2);
      expect(p.ttl).toBeLessThanOrEqual(2.4);
    });
  });

  describe('particle lifecycle', () => {
    it('opacity follows fade curve: starts near 0, increases during fade-in', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState()];
      const timestamps: number[] = [0];
      const config = makeConfig();

      updateParticlePool(pool, states, config, 0.016, 100, timestamps, makeSeededRng(42));

      const p = pool[0]!;
      const t = p.age / p.ttl;
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThan(0.2);
      expect(p.opacity).toBeGreaterThan(0);
      expect(p.opacity).toBeLessThan(1);
    });

    it('opacity reaches 1 during middle of lifetime', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState()];
      const timestamps: number[] = [0];
      const config = makeConfig();

      updateParticlePool(pool, states, config, 0.5, 100, timestamps, makeSeededRng(42));

      const p = pool[0]!;
      expect(p.opacity).toBeGreaterThanOrEqual(0.99);
    });

    it('particle Y advances by fall speed × dt', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState({ y: 300 })];
      const timestamps: number[] = [0];
      const config = makeConfig();

      updateParticlePool(pool, states, config, 0.5, 100, timestamps, makeSeededRng(42));

      const p = pool[0]!;
      expect(p.y).toBeCloseTo(300 + FALL_SPEED * 0.5, 2);
    });

    it('particle is recycled when age ≥ TTL (becomes inactive)', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState()];
      const timestamps: number[] = [0];
      const config = withButterflyOverride(makeConfig(), { ttlMin: 100, ttlMax: 100 });

      updateParticlePool(pool, states, config, 0.12, 0, timestamps, makeSeededRng(42));

      expect(pool[0]!.active).toBe(false);
      expect(pool[0]!.opacity).toBe(0);
    });

    it('particle opacity fades out over the last fadeOutFraction of TTL', () => {
      const pool = createEmptyParticlePool();
      const states = [roamerState()];
      const timestamps: number[] = [0];
      const config = withButterflyOverride(makeConfig(), { ttlMin: 1000, ttlMax: 1000 });

      updateParticlePool(pool, states, config, 0.75, 0, timestamps, makeSeededRng(42));

      const p = pool[0]!;
      expect(p.opacity).toBeGreaterThan(0);
      expect(p.opacity).toBeLessThan(1);
    });
  });

  describe('slot reuse', () => {
    it('when a particle dies, next emission reuses its slot', () => {
      const config = withButterflyOverride(makeConfig(), { ttlMin: 1000, ttlMax: 1000 });
      const pool = createEmptyParticlePool();
      const states = [roamerState()];
      const timestamps: number[] = [-1000];
      const rng1 = makeSeededRng(42);

      updateParticlePool(pool, states, config, 0.01, 0, timestamps, rng1);
      expect(pool[0]!.active).toBe(true);

      updateParticlePool(pool, states, config, 1.2, 1500, timestamps, rng1);
      expect(pool[0]!.active).toBe(false);

      timestamps[0] = 0;
      const rng2 = makeSeededRng(99);
      updateParticlePool(pool, states, config, 0.01, 2000, timestamps, rng2);
      expect(pool[0]!.active).toBe(true);
    });
  });

  describe('multiple roamers', () => {
    it('emits particles from multiple flying roamers', () => {
      const pool = createEmptyParticlePool();
      const states = [
        roamerState({ x: 100, y: 200 }),
        roamerState({ x: 300, y: 400, species: 'bee' }),
        roamerState({ x: 500, y: 600, species: 'bumblebee' }),
      ];
      const timestamps: number[] = [0, 0, 0];
      const config = makeConfig();

      updateParticlePool(pool, states, config, 0.016, 100, timestamps, makeSeededRng());

      expect(countActive(pool)).toBe(3);
    });
  });

  describe('determinism', () => {
    it('same seed + same inputs = same emissions and updates', () => {
      function runSim() {
        const pool = createEmptyParticlePool();
        const states = [roamerState({ x: 200, y: 300 })];
        const config = makeConfig();
        const timestamps: number[] = [0];
        updateParticlePool(pool, states, config, 0.1, 100, timestamps, makeSeededRng(777));
        updateParticlePool(pool, states, config, 0.2, 300, timestamps, makeSeededRng(777));
        return pool.map(p => ({ x: p.x, y: p.y, opacity: p.opacity, radius: p.radius, active: p.active }));
      }

      const a = runSim();
      const b = runSim();
      expect(a).toEqual(b);
    });
  });
});
