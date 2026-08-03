import {
  createEmptyOrbCloudPool,
  sampleOrbCloudRadiusFraction,
  staggerOrbCloudPool,
  stepOrbCloudPool,
} from '../orbCloudWorklets';
import type { CloudPatchSlot, OrbCloudLayerConfig } from '../orbCloudTypes';
import { CloudPatchStage } from '../orbCloudTypes';

function makeConfig(overrides?: Partial<OrbCloudLayerConfig>): OrbCloudLayerConfig {
  return {
    centerX: 200,
    centerY: 300,
    diameter: 400,
    patchCount: 4,
    peakOpacity: 0.8,
    opacityJitter: 0.15,
    edgeBias: 0.5,
    lifetimeMinMs: 1000,
    lifetimeMaxMs: 1000,
    fadeInMs: 500,
    fadeOutMs: 500,
    minSizeFraction: 0.4,
    maxSizeFraction: 0.75,
    spawnMarginFraction: 0.6,
    initialDelayMaxMs: 500,
    dismissFadeMs: 380,
    dismissing: 0,
    imageCount: 21,
    ...overrides,
  };
}

function makePendingSpawns(): { value: number } {
  return { value: 0 };
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

function countActive(pool: CloudPatchSlot[]): number {
  return pool.filter(slot => slot.active).length;
}

describe('createEmptyOrbCloudPool', () => {
  it('creates the requested number of inactive slots', () => {
    const pool = createEmptyOrbCloudPool(4);
    expect(pool).toHaveLength(4);
    expect(countActive(pool)).toBe(0);
    for (const slot of pool) {
      expect(slot.stage).toBe(CloudPatchStage.Hidden);
      expect(slot.opacity).toBe(0);
    }
  });
});

describe('sampleOrbCloudRadiusFraction', () => {
  it('returns values within [0, 1] for any bias', () => {
    for (const edgeBias of [0, 0.25, 0.5, 0.75, 1]) {
      const rng = makeSeededRng(7);
      for (let i = 0; i < 200; i++) {
        const value = sampleOrbCloudRadiusFraction(edgeBias, rng);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('edgeBias 0.5 produces a uniform mean of ~0.5', () => {
    const rng = makeSeededRng(11);
    let sum = 0;
    const samples = 5000;
    for (let i = 0; i < samples; i++) {
      sum += sampleOrbCloudRadiusFraction(0.5, rng);
    }
    expect(sum / samples).toBeCloseTo(0.5, 1);
  });

  it('edgeBias 0 concentrates samples toward the center', () => {
    const rng = makeSeededRng(13);
    const samples = 2000;
    let sum = 0;
    let belowHalf = 0;
    for (let i = 0; i < samples; i++) {
      const value = sampleOrbCloudRadiusFraction(0, rng);
      sum += value;
      if (value < 0.5) {
        belowHalf++;
      }
    }
    expect(sum / samples).toBeLessThan(0.4);
    expect(belowHalf / samples).toBeGreaterThan(0.6);
  });

  it('edgeBias 1 concentrates samples toward the edge', () => {
    const rng = makeSeededRng(17);
    const samples = 2000;
    let sum = 0;
    let aboveHalf = 0;
    for (let i = 0; i < samples; i++) {
      const value = sampleOrbCloudRadiusFraction(1, rng);
      sum += value;
      if (value > 0.5) {
        aboveHalf++;
      }
    }
    expect(sum / samples).toBeGreaterThan(0.6);
    expect(aboveHalf / samples).toBeGreaterThan(0.6);
  });
});

describe('staggerOrbCloudPool', () => {
  it('gives every slot a random delay within the max', () => {
    const pool = createEmptyOrbCloudPool(4);
    staggerOrbCloudPool(pool, 500, makeSeededRng(3));
    for (const slot of pool) {
      expect(slot.active).toBe(false);
      expect(slot.respawnDelay).toBeGreaterThanOrEqual(0);
      expect(slot.respawnDelay).toBeLessThanOrEqual(0.5);
    }
  });

  it('spawns immediately when the max delay is 0', () => {
    const pool = createEmptyOrbCloudPool(2);
    staggerOrbCloudPool(pool, 0, makeSeededRng(3));
    for (const slot of pool) {
      expect(slot.respawnDelay).toBe(0);
    }
  });
});

describe('stepOrbCloudPool spawn', () => {
  it('spawns a patch after its stagger delay elapses', () => {
    const pool = createEmptyOrbCloudPool(1);
    pool[0]!.respawnDelay = 0.5;
    stepOrbCloudPool(pool, makeConfig(), 0.4, makePendingSpawns(), makeSeededRng(5));
    expect(countActive(pool)).toBe(0);
    stepOrbCloudPool(pool, makeConfig(), 0.2, makePendingSpawns(), makeSeededRng(5));
    expect(countActive(pool)).toBe(1);
  });

  it('spawned patch sits inside the orb disk with in-range size and image', () => {
    const pool = createEmptyOrbCloudPool(1);
    pool[0]!.respawnDelay = 0;
    const config = makeConfig({
      diameter: 400,
      minSizeFraction: 0.2,
      maxSizeFraction: 0.5,
    });
    stepOrbCloudPool(pool, config, 0.001, makePendingSpawns(), makeSeededRng(5));

    const slot = pool[0]!;
    expect(slot.active).toBe(true);
    expect(slot.stage).toBe(CloudPatchStage.Entering);
    expect(slot.size).toBeGreaterThanOrEqual(400 * 0.2);
    expect(slot.size).toBeLessThanOrEqual(400 * 0.5);
    expect(slot.imageIndex).toBeGreaterThanOrEqual(0);
    expect(slot.imageIndex).toBeLessThan(21);

    const dx = slot.x - config.centerX;
    const dy = slot.y - config.centerY;
    const maxRadius = Math.max(0, 200 - slot.size * config.spawnMarginFraction);
    expect(Math.sqrt(dx * dx + dy * dy)).toBeLessThanOrEqual(maxRadius + 0.001);
  });

  it('edgeBias 0 spawns patches closer to the center than edgeBias 1', () => {
    function meanSpawnRadius(edgeBias: number): number {
      const config = makeConfig({
        edgeBias,
        fadeInMs: 100,
        lifetimeMinMs: 100,
        lifetimeMaxMs: 100,
        fadeOutMs: 100,
      });
      const pool = createEmptyOrbCloudPool(1);
      pool[0]!.respawnDelay = 0;
      const pendingSpawns = makePendingSpawns();
      let sum = 0;
      let count = 0;
      const rng = makeSeededRng(99);
      const intoExit = (config.fadeInMs + config.lifetimeMinMs) / 1000;
      const out = (config.fadeOutMs + 0.001) / 1000;
      for (let i = 0; i < 60; i++) {
        stepOrbCloudPool(pool, config, intoExit, pendingSpawns, rng);
        stepOrbCloudPool(pool, config, out, pendingSpawns, rng);
        const slot = pool[0]!;
        if (slot.active) {
          const dx = slot.x - config.centerX;
          const dy = slot.y - config.centerY;
          sum += Math.sqrt(dx * dx + dy * dy);
          count++;
        }
      }
      return count > 0 ? sum / count : 0;
    }

    expect(meanSpawnRadius(0)).toBeLessThan(meanSpawnRadius(1));
  });

  it('peak opacity is jittered around the configured value and clamped to [0, 1]', () => {
    const pool = createEmptyOrbCloudPool(1);
    pool[0]!.respawnDelay = 0;
    stepOrbCloudPool(pool, makeConfig(), 0.001, makePendingSpawns(), makeSeededRng(5));
    const slot = pool[0]!;
    expect(slot.peakOpacity).toBeGreaterThanOrEqual(0);
    expect(slot.peakOpacity).toBeLessThanOrEqual(1);
    expect(slot.peakOpacity).toBeGreaterThanOrEqual(0.8 - 0.15 - 0.001);
    expect(slot.peakOpacity).toBeLessThanOrEqual(0.8 + 0.15 + 0.001);
  });
});

describe('stepOrbCloudPool lifecycle', () => {
  it('opacity ramps up through fade-in and holds at peak', () => {
    const config = makeConfig({ fadeInMs: 500, lifetimeMinMs: 1000, lifetimeMaxMs: 1000 });
    const pool = createEmptyOrbCloudPool(1);
    pool[0]!.respawnDelay = 0;
    const pendingSpawns = makePendingSpawns();
    const rng = makeSeededRng(5);

    stepOrbCloudPool(pool, config, 0.001, pendingSpawns, rng);
    stepOrbCloudPool(pool, config, 0.25, pendingSpawns, rng);
    const midFade = pool[0]!;
    expect(midFade.stage).toBe(CloudPatchStage.Entering);
    expect(midFade.opacity).toBeCloseTo(0.5 * midFade.peakOpacity, 5);

    stepOrbCloudPool(pool, config, 0.5, pendingSpawns, rng);
    const holding = pool[0]!;
    expect(holding.stage).toBe(CloudPatchStage.Holding);
    expect(holding.opacity).toBe(holding.peakOpacity);
  });

  it('fades out during the exit phase and dies after the full cycle', () => {
    const config = makeConfig({
      fadeInMs: 500,
      lifetimeMinMs: 1000,
      lifetimeMaxMs: 1000,
      fadeOutMs: 500,
    });
    const pool = createEmptyOrbCloudPool(1);
    pool[0]!.respawnDelay = 0;
    const pendingSpawns = makePendingSpawns();
    const rng = makeSeededRng(5);

    stepOrbCloudPool(pool, config, 0.001, pendingSpawns, rng);
    stepOrbCloudPool(pool, config, 1.6, pendingSpawns, rng);
    const exiting = pool[0]!;
    expect(exiting.stage).toBe(CloudPatchStage.Exiting);
    expect(exiting.opacity).toBeCloseTo(0.8 * exiting.peakOpacity, 5);

    stepOrbCloudPool(pool, config, 1.0, pendingSpawns, rng);
    const refilled = pool[0]!;
    expect(refilled.active).toBe(true);
    expect(refilled.stage).toBe(CloudPatchStage.Entering);
    expect(refilled.age).toBeLessThan(0.001);
    expect(pendingSpawns.value).toBe(0);
  });

  it('fades a replacement in while the previous patch is still fading out', () => {
    const config = makeConfig({
      fadeInMs: 100,
      lifetimeMinMs: 300,
      lifetimeMaxMs: 300,
      fadeOutMs: 500,
    });
    const pool = createEmptyOrbCloudPool(2);
    staggerOrbCloudPool(pool, 0, makeSeededRng(5));
    const pendingSpawns = makePendingSpawns();
    const rng = makeSeededRng(5);

    stepOrbCloudPool(pool, config, 0.001, pendingSpawns, rng);
    expect(countActive(pool)).toBe(2);

    pool[0]!.holdSeconds = 0.3;
    pool[1]!.holdSeconds = 0.6;

    stepOrbCloudPool(pool, config, 0.9, pendingSpawns, rng);

    expect(countActive(pool)).toBe(2);
    const a = pool[0]!;
    const b = pool[1]!;
    const entering = [a, b].filter(slot => slot.stage === CloudPatchStage.Entering);
    const exiting = [a, b].filter(slot => slot.stage === CloudPatchStage.Exiting);
    expect(entering).toHaveLength(1);
    expect(exiting).toHaveLength(1);
  });

  it('keeps the pool topped up while cycling replacements', () => {
    const config = makeConfig({
      fadeInMs: 100,
      lifetimeMinMs: 100,
      lifetimeMaxMs: 100,
      fadeOutMs: 100,
    });
    const pool = createEmptyOrbCloudPool(2);
    staggerOrbCloudPool(pool, 400, makeSeededRng(5));
    const pendingSpawns = makePendingSpawns();

    const dt = 0.05;
    let maxActive = 0;
    let emptyAfterStart = 0;
    let started = false;
    const rng = makeSeededRng(5);
    for (let i = 0; i < 400; i++) {
      stepOrbCloudPool(pool, config, dt, pendingSpawns, rng);
      const active = countActive(pool);
      if (active > 0) {
        started = true;
      } else if (started) {
        emptyAfterStart++;
      }
      maxActive = Math.max(maxActive, active);
    }
    expect(emptyAfterStart).toBe(0);
    expect(maxActive).toBe(2);
    expect(pendingSpawns.value).toBe(0);
  });

  it('while dismissing, slots die out and never respawn', () => {
    const config = makeConfig({
      fadeInMs: 100,
      lifetimeMinMs: 100,
      lifetimeMaxMs: 100,
      fadeOutMs: 100,
    });
    const pool = createEmptyOrbCloudPool(2);
    staggerOrbCloudPool(pool, 0, makeSeededRng(5));
    const pendingSpawns = makePendingSpawns();
    const rng = makeSeededRng(5);

    for (let i = 0; i < 10; i++) {
      stepOrbCloudPool(pool, config, 0.05, pendingSpawns, rng);
    }
    expect(countActive(pool)).toBe(2);

    const dismissingConfig = { ...config, dismissing: 1 as const };
    for (let i = 0; i < 100; i++) {
      stepOrbCloudPool(pool, dismissingConfig, 0.4, pendingSpawns, rng);
    }
    expect(countActive(pool)).toBe(0);
    expect(pendingSpawns.value).toBe(0);
    for (const slot of pool) {
      expect(slot.respawnDelay).toBe(-1);
    }
  });
});

describe('determinism', () => {
  it('same seed + same inputs produces identical pools', () => {
    function runSim() {
      const config = makeConfig();
      const pool = createEmptyOrbCloudPool(3);
      staggerOrbCloudPool(pool, 500, makeSeededRng(777));
      const pendingSpawns = makePendingSpawns();
      const rng = makeSeededRng(777);
      for (let i = 0; i < 300; i++) {
        stepOrbCloudPool(pool, config, 0.016, pendingSpawns, rng);
      }
      return pool.map(slot => ({
        x: slot.x,
        y: slot.y,
        size: slot.size,
        opacity: slot.opacity,
        imageIndex: slot.imageIndex,
        stage: slot.stage,
        active: slot.active,
      }));
    }

    expect(runSim()).toEqual(runSim());
  });
});
