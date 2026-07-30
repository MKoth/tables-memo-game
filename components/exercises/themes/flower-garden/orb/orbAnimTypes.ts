import type { SharedValue } from 'react-native-reanimated';

export const OrbPhase = {
  None: -1,
  Enter: 0,
  Idle: 1,
  Burst: 2,
} as const;

export type OrbPhaseValue = (typeof OrbPhase)[keyof typeof OrbPhase];

export type PetalRingConfig = {
  ringIndex: number;
  centerRadius: number;
  thickness: number;
  petalCount: number;
  rotationSpeed: number;
  direction: 1 | -1;
  widthFraction: number;
};

export type PetalAnimState = {
  x: number;
  y: number;
  angle: number;
  scaleX: number;
  opacity: number;
};

export type OrbAnimState = {
  centerX: number;
  centerY: number;
  diameter: number;
  overallOpacity: number;
  petals: PetalAnimState[];
};

export type OrbAnimationConfig = {
  originX: number;
  originY: number;
  targetCenterX: number;
  targetCenterY: number;
  targetDiameter: number;
};

export type PetalSpawnConfig = {
  ringIndex: number;
  imageIndex: number;
  initialAngle: number;
  phase: number;
  phaseSpeed: number;
  brownianStep: number;
  driftPhase: number;
  startRadius: number;
  startAngle: number;
  /** Burst direction offset in [-1, 1], scaled by ORB_BURST_CONE_RAD at use site. */
  burstAngle: number;
  /** Burst speed multiplier in [ORB_BURST_SPEED_MIN, ORB_BURST_SPEED_MAX]. */
  burstSpeed: number;
};

export type UseOrbAnimationResult = {
  anim: SharedValue<OrbAnimState>;
  phase: SharedValue<number>;
  startBurst: () => void;
};
