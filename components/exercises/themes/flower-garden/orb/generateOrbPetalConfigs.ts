import {
  ORB_BURST_SPEED_MAX,
  ORB_BURST_SPEED_MIN,
  ORB_PETAL_BROWNIAN_STEP_MAX,
  ORB_PETAL_BROWNIAN_STEP_MIN,
  ORB_PETAL_COUNT,
  ORB_PETAL_PHASE_SPEED_MAX,
  ORB_PETAL_PHASE_SPEED_MIN,
  ORB_RING_CONFIGS,
  ORB_SPAWN_ANGLE_JITTER,
  ORB_SPAWN_RADIUS_RATIO,
} from './orbAnimPresets';
import type { Rng } from '../scenery/BushShaderLayer/helpers/seededRandom';
import type { PetalRingConfig, PetalSpawnConfig } from './orbAnimTypes';

export type { Rng };

export type OrbConfigInput = {
  rings?: ReadonlyArray<PetalRingConfig>;
  petalImageCount?: number;
  rng: Rng;
};

function randomInRange(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

function clampSpawnOffset(
  startRadius: number,
  startAngle: number,
  ringCenter: number,
  ringThickness: number,
): { startRadius: number; startAngle: number } {
  const radialMin = Math.max(0, ringCenter - ringThickness * 0.5);
  const radialMax = ringCenter + ringThickness * 0.5;
  const clampedRadius = Math.max(radialMin, Math.min(radialMax, startRadius));
  return {
    startRadius: clampedRadius,
    startAngle: ((startAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2),
  };
}

export function generateOrbPetalConfigs(input: OrbConfigInput): PetalSpawnConfig[] {
  const rings = input.rings ?? ORB_RING_CONFIGS;
  const petalImageCount = input.petalImageCount ?? ORB_PETAL_COUNT;
  const { rng } = input;

  const petals: PetalSpawnConfig[] = [];

  for (const ring of rings) {
    const ringCenter = ring.centerRadius;
    const ringThickness = ring.thickness;
    const angleStep = (Math.PI * 2) / ring.petalCount;
    const angleJitter = Math.min(angleStep * 0.25, ORB_SPAWN_ANGLE_JITTER);

    for (let i = 0; i < ring.petalCount; i++) {
      const baseAngle = i * angleStep;
      const angle = baseAngle + (rng() - 0.5) * 2 * angleJitter;
      const startRadius =
        ringCenter + (rng() - 0.5) * ringThickness * ORB_SPAWN_RADIUS_RATIO;
      const startAngle = angle + (rng() - 0.5) * ORB_SPAWN_ANGLE_JITTER;
      const clamped = clampSpawnOffset(
        startRadius,
        startAngle,
        ringCenter,
        ringThickness,
      );

      petals.push({
        ringIndex: ring.ringIndex,
        imageIndex: Math.floor(rng() * petalImageCount),
        initialAngle: baseAngle,
        phase: rng() * Math.PI * 2,
        phaseSpeed: randomInRange(
          rng,
          ORB_PETAL_PHASE_SPEED_MIN,
          ORB_PETAL_PHASE_SPEED_MAX,
        ),
        brownianStep: randomInRange(
          rng,
          ORB_PETAL_BROWNIAN_STEP_MIN,
          ORB_PETAL_BROWNIAN_STEP_MAX,
        ),
        driftPhase: rng() * Math.PI * 2,
        startRadius: clamped.startRadius,
        startAngle: clamped.startAngle,
        burstAngle: rng() * 2 - 1,
        burstSpeed: randomInRange(
          rng,
          ORB_BURST_SPEED_MIN,
          ORB_BURST_SPEED_MAX,
        ),
      });
    }
  }

  return petals;
}
