import { FlightState } from '../core/types';
import type { RoamerSpecies } from '../core/types';
import type { ParticleInternal, RoamerParticleConfig, RoamerParticleState } from './particleTypes';
import { MAX_PARTICLES } from './particleConfig';

const SPECIES_KEYS: RoamerSpecies[] = ['butterfly', 'bee', 'bumblebee'];

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
      startRadius: 0,
      endRadius: 0,
      fadeInFraction: 0,
      fadeOutFraction: 0,
      speciesIndex: 0,
      colorIndex: 0,
      lastColorChangeMs: 0,
      colorChangeIntervalMs: 0,
      vx: 0,
      vy: 0,
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
          const startRadius = lerp(speciesCfg.startDiameterMin, speciesCfg.startDiameterMax, rng()) / 2;
          const endRadius = lerp(speciesCfg.endDiameterMin, speciesCfg.endDiameterMax, rng()) / 2;
          const ttl = lerp(speciesCfg.ttlMin, speciesCfg.ttlMax, rng()) / 1000;
          const p = pool[slot]!;
          p.x = rs.x;
          p.y = rs.y;
          p.opacity = 0;
          p.radius = startRadius;
          p.startRadius = startRadius;
          p.endRadius = endRadius;
          p.fadeInFraction = speciesCfg.fadeInFraction;
          p.fadeOutFraction = speciesCfg.fadeOutFraction;
          p.speciesIndex = rs.species === 'bee' ? 1 : rs.species === 'bumblebee' ? 2 : 0;
          p.colorIndex = 0;
          p.lastColorChangeMs = elapsedMs;
          p.colorChangeIntervalMs = speciesCfg.colorChangeIntervalMs;
          p.r = speciesCfg.colors[0]![0];
          p.g = speciesCfg.colors[0]![1];
          p.b = speciesCfg.colors[0]![2];
          p.age = 0;
          p.ttl = ttl;
          p.active = true;
          const deviatedAngle = rs.angle + (rng() * 2 - 1) * speciesCfg.deviationRad;
          p.vx = -Math.cos(deviatedAngle) * speciesCfg.driftSpeed;
          p.vy = -Math.sin(deviatedAngle) * speciesCfg.driftSpeed;
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

    p.radius = lerp(p.startRadius, p.endRadius, t);

    if (t < p.fadeInFraction) {
      p.opacity = t / p.fadeInFraction;
    } else if (t > 1 - p.fadeOutFraction) {
      p.opacity = (1 - t) / p.fadeOutFraction;
      if (p.opacity < 0) p.opacity = 0;
    } else {
      p.opacity = 1;
    }

    if (p.colorChangeIntervalMs > 0 && elapsedMs - p.lastColorChangeMs >= p.colorChangeIntervalMs) {
      const speciesKey = SPECIES_KEYS[p.speciesIndex]!;
      const cfg = config.species[speciesKey]!;
      const colors = cfg.colors;
      if (colors.length > 1) {
        p.colorIndex = (p.colorIndex + 1) % colors.length;
        const c = colors[p.colorIndex]!;
        p.r = c[0];
        p.g = c[1];
        p.b = c[2];
        p.lastColorChangeMs = elapsedMs;
      }
    }

    p.x += p.vx * dt;
    p.y += (config.fallSpeed + p.vy) * dt;
  }
}
