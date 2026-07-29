import { FlightState } from '../core/types';
import type { ParticleInternal, RoamerParticleConfig, RoamerParticleState } from './particleTypes';
import { MAX_PARTICLES } from './particleConfig';

export function createEmptyParticlePool(): ParticleInternal[] {
  const pool: ParticleInternal[] = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pool.push({
      x: 0,
      y: 0,
      opacity: 0,
      radius: 0,
      r: 0,
      g: 0,
      b: 0,
      age: 0,
      ttl: 0,
      active: false,
    });
  }
  return pool;
}

function findDeadSlot(pool: ParticleInternal[]): number {
  'worklet';
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i]!.active) {
      return i;
    }
  }
  return -1;
}

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

export function updateParticlePool(
  pool: ParticleInternal[],
  roamerStates: RoamerParticleState[],
  config: RoamerParticleConfig,
  dt: number,
  elapsedMs: number,
  lastEmitTimestamps: number[],
  rng: () => number,
): void {
  'worklet';
  for (let i = 0; i < roamerStates.length; i++) {
    const rs = roamerStates[i]!;
    const isFlying =
      rs.flightState === FlightState.FLYING_CRUISE ||
      rs.flightState === FlightState.APPROACH_FLOWER;

    if (isFlying) {
      const speciesCfg = config.species[rs.species];
      const lastEmit = lastEmitTimestamps[i] ?? 0;
      if (elapsedMs - lastEmit >= speciesCfg.emitIntervalMs) {
        const slot = findDeadSlot(pool);
        if (slot >= 0) {
          const radius = lerp(config.diameterMin, config.diameterMax, rng()) / 2;
          const ttl = lerp(speciesCfg.ttlMin, speciesCfg.ttlMax, rng()) / 1000;
          const p = pool[slot]!;
          p.x = rs.x;
          p.y = rs.y;
          p.opacity = 0;
          p.radius = radius;
          p.r = speciesCfg.color[0];
          p.g = speciesCfg.color[1];
          p.b = speciesCfg.color[2];
          p.age = 0;
          p.ttl = ttl;
          p.active = true;
        }
        lastEmitTimestamps[i] = elapsedMs;
      }
    }
  }

  for (let i = 0; i < pool.length; i++) {
    const p = pool[i]!;
    if (!p.active) continue;

    p.age += dt;

    if (p.age >= p.ttl) {
      p.active = false;
      p.opacity = 0;
      continue;
    }

    const t = p.age / p.ttl;

    if (t < config.fadeInFraction) {
      p.opacity = t / config.fadeInFraction;
    } else if (t > 1 - config.fadeOutFraction) {
      p.opacity = (1 - t) / config.fadeOutFraction;
      if (p.opacity < 0) p.opacity = 0;
    } else {
      p.opacity = 1;
    }

    p.y += config.fallSpeed * dt;
  }
}
