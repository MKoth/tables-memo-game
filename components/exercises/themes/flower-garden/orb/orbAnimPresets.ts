import type { PetalRingConfig } from './orbAnimTypes';

export const ORB_PETAL_COUNT = 21;

export const ORB_ENTER_DURATION_MS = 500;
export const ORB_BURST_DURATION_MS = 400;

export const ORB_RING_RADII_FRACTIONS: ReadonlyArray<{
  center: number;
  thickness: number;
  widthFraction: number;
}> = [
  { center: 0.15, thickness: 0.08, widthFraction: 0.7 },
  { center: 0.35, thickness: 0.14, widthFraction: 0.8 },
  { center: 0.6, thickness: 0.18, widthFraction: 0.9 },
];

export const ORB_RING_PETAL_COUNTS: ReadonlyArray<number> = [18, 24, 36];

export const ORB_RING_ROTATION_SPEEDS: ReadonlyArray<number> = [0.32, -0.22, 0.14];

export const ORB_PETAL_STRETCH_GAIN = 0.55;
export const ORB_PETAL_PHASE_SPEED_MIN = 0.9;
export const ORB_PETAL_PHASE_SPEED_MAX = 1.8;
export const ORB_PETAL_BROWNIAN_STEP_MIN = 0.0008;
export const ORB_PETAL_BROWNIAN_STEP_MAX = 0.0035;

export const ORB_SPAWN_RADIUS_RATIO = 0.05;
export const ORB_SPAWN_ANGLE_JITTER = Math.PI * 2;
export const ORB_SPAWN_DIAMETER_RATIO = 0.18;

export const ORB_PETAL_BASE_SIZE_PX = 28;
export const ORB_PETAL_SIZE_FACTOR_BY_RING: ReadonlyArray<number> = [0.9, 1.15, 1.4];
export const ORB_PETAL_WIDTH_FRACTION_BOOST = 6;

export const ORB_BURST_DISTANCE = 0.85;
export const ORB_BURST_CONE_RAD = Math.PI / 6;
export const ORB_BURST_SPEED_MIN = 0.85;
export const ORB_BURST_SPEED_MAX = 1.25;

export const ORB_DIAMETER_RATIO = 0.65;
export const ORB_ROAMER_SCALE = 1.22;
export const ORB_ROAMER_TAP_HIT_RADIUS = 36;

export const ORB_PETAL_FADE_START = 0.5;
export const ORB_PETAL_FADE_END = 1.0;

export const ORB_RING_CONFIGS: ReadonlyArray<PetalRingConfig> = ORB_RING_RADII_FRACTIONS.map(
  (radius, ringIndex) => ({
    ringIndex,
    centerRadius: radius.center,
    thickness: radius.thickness,
    petalCount: ORB_RING_PETAL_COUNTS[ringIndex]!,
    rotationSpeed: ORB_RING_ROTATION_SPEEDS[ringIndex]!,
    direction: ORB_RING_ROTATION_SPEEDS[ringIndex]! >= 0 ? 1 : -1,
    widthFraction: radius.widthFraction,
  }),
);
