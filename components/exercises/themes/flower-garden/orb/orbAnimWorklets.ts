import {
  ORB_PETAL_FADE_END,
  ORB_PETAL_FADE_START,
  ORB_SPAWN_DIAMETER_RATIO,
  ORB_WRONG_SHAKE_HZ,
  ORB_WRONG_TINT_STRENGTH,
} from './orbAnimPresets';
import {
  OrbPhase,
  type OrbAnimState,
  type OrbAnimationConfig,
} from './orbAnimTypes';

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

function clamp01(t: number): number {
  'worklet';
  return Math.min(1, Math.max(0, t));
}

export type OrbWrongStateInput = {
  /** Wrong-feedback progress in [0, 1]; 0 = no feedback. */
  progress: number;
  /** Monotonic clock (ms) driving the shake oscillation. */
  clockMs: number;
  /** Tint color channels (0–1) shown while wrong. */
  r: number;
  g: number;
  b: number;
};

const NO_WRONG: OrbWrongStateInput = { progress: 0, clockMs: 0, r: 1, g: 0.35, b: 0.35 };

/**
 * Computes the slim per-frame orb state: position/size/progress scalars only.
 * All per-petal motion (ring rotation, enter spiral, burst scatter, cloud
 * cycles) is derived in-shader from these scalars plus the orb seed.
 */
export function computeOrbAnimState(
  phase: number,
  enterProgress: number,
  burstProgress: number,
  idleElapsedMs: number,
  config: OrbAnimationConfig,
  wrong: OrbWrongStateInput = NO_WRONG,
): OrbAnimState {
  'worklet';
  const targetCenterX = config.moveCenterX?.value ?? config.targetCenterX;
  const targetCenterY = config.moveCenterY?.value ?? config.targetCenterY;
  const targetDiameter = config.moveDiameter?.value ?? config.targetDiameter;
  const startDiameter =
    config.initialDiameter != null && config.initialDiameter > 0
      ? config.initialDiameter
      : targetDiameter * ORB_SPAWN_DIAMETER_RATIO;

  const tintStrength = wrong.progress * ORB_WRONG_TINT_STRENGTH;
  const shakeAmp = wrong.progress * Math.max(2, targetDiameter * 0.05);
  const shakeT = wrong.clockMs / 1000;
  const shakeX = shakeAmp * Math.sin(shakeT * ORB_WRONG_SHAKE_HZ * Math.PI * 2);
  const shakeY = shakeAmp * Math.cos(shakeT * ORB_WRONG_SHAKE_HZ * Math.PI * 2 * 1.17);
  const centerX = targetCenterX + shakeX;
  const centerY = targetCenterY + shakeY;

  const tinted = {
    tintR: wrong.r,
    tintG: wrong.g,
    tintB: wrong.b,
    tintStrength,
  };

  const state = {
    centerX,
    centerY,
    targetDiameter,
    overallOpacity: 0,
    captureVisualT: 0,
    enterT: 0,
    burstT: 0,
    idleElapsedMs: 0,
  };

  if (phase === OrbPhase.None) {
    return {
      ...state,
      diameter: 0,
      phase,
      ...tinted,
    };
  }

  if (phase === OrbPhase.Burst) {
    const t = clamp01(burstProgress);
    const fadeT =
      t < ORB_PETAL_FADE_START
        ? 0
        : clamp01((t - ORB_PETAL_FADE_START) / (ORB_PETAL_FADE_END - ORB_PETAL_FADE_START));
    return {
      ...state,
      diameter: targetDiameter,
      overallOpacity: 1 - fadeT,
      captureVisualT: 1 - clamp01(t / 0.4),
      phase,
      burstT: t,
      idleElapsedMs,
      ...tinted,
    };
  }

  if (phase === OrbPhase.Idle) {
    return {
      ...state,
      diameter: targetDiameter,
      overallOpacity: 1,
      captureVisualT: 1,
      phase,
      enterT: 1,
      idleElapsedMs,
      ...tinted,
    };
  }

  const t = clamp01(enterProgress);
  return {
    ...state,
    centerX: lerp(config.originX, targetCenterX, t) + shakeX,
    centerY: lerp(config.originY, targetCenterY, t) + shakeY,
    diameter: lerp(startDiameter, targetDiameter, t),
    overallOpacity: t,
    captureVisualT: 1,
    phase,
    enterT: t,
    ...tinted,
  };
}
