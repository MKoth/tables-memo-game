import type { SharedValue } from 'react-native-reanimated';

export const OrbPhase = {
  None: -1,
  Enter: 0,
  Idle: 1,
  Burst: 2,
} as const;

export type OrbPhaseValue = (typeof OrbPhase)[keyof typeof OrbPhase];

export const BurstIntent = {
  Release: 0,
  Escape: 1,
} as const;

export type BurstIntentValue = (typeof BurstIntent)[keyof typeof BurstIntent];

export type OrbAnimState = {
  centerX: number;
  centerY: number;
  diameter: number;
  /** Move-resolved target diameter — what the orb settles at (enter/burst move it). */
  targetDiameter: number;
  overallOpacity: number;
  captureVisualT: number;
  phase: number;
  /** Progress of the enter spiral in [0, 1]. */
  enterT: number;
  /** Progress of the burst scatter in [0, 1]. */
  burstT: number;
  /** Seconds-equivalent ms since the idle phase started (frozen at burst start). */
  idleElapsedMs: number;
  /** Wrong-feedback tint color carried for the petal draw (0–1 channels). */
  tintR: number;
  tintG: number;
  tintB: number;
  tintStrength: number;
};

export type OrbAnimationConfig = {
  originX: number;
  originY: number;
  targetCenterX: number;
  targetCenterY: number;
  targetDiameter: number;
  /** When set, the anim resolves position/size from these animated values instead of the raw targets. */
  moveCenterX?: SharedValue<number>;
  moveCenterY?: SharedValue<number>;
  moveDiameter?: SharedValue<number>;
  /** When set, the enter spiral starts here instead of the shared origin. */
  initialCenterX?: number;
  initialCenterY?: number;
  /** When set, the enter spiral starts at this diameter instead of the spawn size. */
  initialDiameter?: number;
  /** When true, the orb renders assembled at the target without an enter spiral. */
  skipEnter?: boolean;
  /** Delay (ms) before the enter spiral starts. */
  enterDelayMs?: number;
  /** Delay (ms) before the burst starts once `startBurst` fires. */
  popDelayMs?: number;
};

export type UseOrbAnimationResult = {
  anim: SharedValue<OrbAnimState>;
  phase: SharedValue<number>;
  startBurst: (intent?: BurstIntentValue) => void;
};

/**
 * Per-letter layout written by the layer parents into a stable shared value so
 * relayouts animate without re-rendering the orb. `centerX/Y`/`diameter` are
 * the targets; `initial*`/`skipEnter`/`moveDurationMs` seed the mount position
 * and the move tween (mirrors the old prop-based layout effect).
 */
export type LetterOrbGeometry = {
  centerX: number;
  centerY: number;
  diameter: number;
  initialCenterX?: number;
  initialCenterY?: number;
  initialDiameter?: number;
  skipEnter?: boolean;
  moveDurationMs?: number;
};
