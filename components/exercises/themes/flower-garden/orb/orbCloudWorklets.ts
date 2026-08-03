import type { CloudPatchSlot, OrbCloudLayerConfig } from './orbCloudTypes';
import { CloudPatchStage } from './orbCloudTypes';
import { ORB_CLOUD_ROTATION_RANGE_RAD } from './orbCloudPresets';

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

function resolveRng(rng?: () => number): () => number {
  'worklet';
  return rng ?? Math.random;
}

export function createEmptyOrbCloudPool(patchCount: number): CloudPatchSlot[] {
  'worklet';
  const pool: CloudPatchSlot[] = [];
  for (let i = 0; i < patchCount; i++) {
    pool.push({
      active: false,
      stage: CloudPatchStage.Hidden,
      age: 0,
      respawnDelay: 0,
      x: 0,
      y: 0,
      size: 0,
      rotation: 0,
      imageIndex: 0,
      opacity: 0,
      peakOpacity: 0,
      fadeInSeconds: 0,
      holdSeconds: 0,
      fadeOutSeconds: 0,
    });
  }
  return pool;
}

/**
 * Samples a radius fraction in [0, 1] from the density
 * p(u) = 2 * ((1 - edgeBias) * (1 - u) + edgeBias * u).
 * edgeBias 0 -> dense at the center, 1 -> dense near the edge, 0.5 -> uniform.
 */
export function sampleOrbCloudRadiusFraction(edgeBias: number, rng?: () => number): number {
  'worklet';
  const y = resolveRng(rng)();
  if (edgeBias === 0.5) {
    return y;
  }
  const a = 2 * edgeBias - 1;
  const c = 2 * (1 - edgeBias);
  return (Math.sqrt(c * c + 4 * a * y) - c) / (2 * a);
}

export function spawnOrbCloudPatch(
  slot: CloudPatchSlot,
  config: OrbCloudLayerConfig,
  rng?: () => number,
): void {
  'worklet';
  const rand = resolveRng(rng);
  const size = lerp(config.minSizeFraction, config.maxSizeFraction, rand()) * config.diameter;
  const maxRadius = Math.max(
    0,
    config.diameter * 0.5 - size * config.spawnMarginFraction,
  );
  const radius = maxRadius * sampleOrbCloudRadiusFraction(config.edgeBias, rand);
  const angle = rand() * Math.PI * 2;
  const jitter = rand() * 2 - 1;

  slot.active = true;
  slot.stage = CloudPatchStage.Entering;
  slot.age = 0;
  slot.x = config.centerX + Math.cos(angle) * radius;
  slot.y = config.centerY + Math.sin(angle) * radius;
  slot.size = size;
  slot.rotation = jitter * ORB_CLOUD_ROTATION_RANGE_RAD;
  slot.imageIndex = Math.min(config.imageCount - 1, Math.floor(rand() * config.imageCount));
  slot.opacity = 0;
  slot.peakOpacity = Math.max(0, Math.min(1, config.peakOpacity + jitter * config.opacityJitter));
  slot.fadeInSeconds = config.fadeInMs / 1000;
  slot.holdSeconds = lerp(config.lifetimeMinMs, config.lifetimeMaxMs, rand()) / 1000;
  slot.fadeOutSeconds = config.fadeOutMs / 1000;
}

/**
 * Steps the pool one frame. When a patch starts fading out it requests a
 * replacement (pendingSpawns); the next freed slot spawns it immediately, so
 * the new patch fades in while the old one is still fading out.
 */
export function stepOrbCloudPool(
  pool: CloudPatchSlot[],
  config: OrbCloudLayerConfig,
  dt: number,
  pendingSpawns: { value: number },
  rng?: () => number,
): void {
  'worklet';
  for (let i = 0; i < pool.length; i++) {
    const slot = pool[i]!;
    if (!slot.active) {
      continue;
    }

    const prevStage = slot.stage;
    slot.age += dt;

    const total = slot.fadeInSeconds + slot.holdSeconds + slot.fadeOutSeconds;
    if (slot.age >= total) {
      slot.active = false;
      slot.stage = CloudPatchStage.Hidden;
      slot.opacity = 0;
      slot.respawnDelay = -1;
      continue;
    }

    if (slot.age < slot.fadeInSeconds) {
      slot.stage = CloudPatchStage.Entering;
      slot.opacity = (slot.age / slot.fadeInSeconds) * slot.peakOpacity;
    } else if (slot.age < slot.fadeInSeconds + slot.holdSeconds) {
      slot.stage = CloudPatchStage.Holding;
      slot.opacity = slot.peakOpacity;
    } else {
      slot.stage = CloudPatchStage.Exiting;
      const exitT = (slot.age - slot.fadeInSeconds - slot.holdSeconds) / slot.fadeOutSeconds;
      slot.opacity = slot.peakOpacity * Math.max(0, 1 - exitT);
    }

    if (
      prevStage !== CloudPatchStage.Exiting &&
      slot.stage === CloudPatchStage.Exiting &&
      config.dismissing !== 1
    ) {
      pendingSpawns.value += 1;
    }
  }

  for (let i = 0; i < pool.length; i++) {
    const slot = pool[i]!;
    if (slot.active) {
      continue;
    }

    if (slot.respawnDelay === -1) {
      if (config.dismissing !== 1 && pendingSpawns.value > 0) {
        spawnOrbCloudPatch(slot, config, rng);
        pendingSpawns.value -= 1;
      }
      continue;
    }

    if (config.dismissing === 1) {
      continue;
    }

    if (slot.respawnDelay > 0) {
      slot.respawnDelay = Math.max(0, slot.respawnDelay - dt);
    }
    if (slot.respawnDelay <= 0) {
      spawnOrbCloudPatch(slot, config, rng);
    }
  }
}

/** Staggers the first spawn of every slot so the layer fills in gradually. */
export function staggerOrbCloudPool(
  pool: CloudPatchSlot[],
  initialDelayMaxMs: number,
  rng?: () => number,
): void {
  'worklet';
  const rand = resolveRng(rng);
  for (let i = 0; i < pool.length; i++) {
    const slot = pool[i]!;
    slot.active = false;
    slot.stage = CloudPatchStage.Hidden;
    slot.age = 0;
    slot.opacity = 0;
    slot.respawnDelay = initialDelayMaxMs <= 0 ? 0 : rand() * initialDelayMaxMs / 1000;
  }
}
