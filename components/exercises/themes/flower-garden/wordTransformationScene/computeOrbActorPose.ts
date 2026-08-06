import {
  ORB_BURST_DURATION_MS,
  ORB_ENTER_DURATION_MS,
  ORB_WRONG_FEEDBACK_MS,
  ORB_WRONG_RAMP_MS,
} from '../orb/orbAnimPresets';
import { OrbPhase, type OrbAnimState } from '../orb/orbAnimTypes';
import {
  computeOrbAnimState,
  type OrbWrongStateInput,
} from '../orb/orbAnimWorklets';
import type { OrbActorRuntime } from './orbActorSceneTypes';
import { resolveActorTargetGeometry } from './reconcileOrbActorScene';
import { clamp01, easeInOutCubic, easeOutCubic } from './workletMath';

const WRONG_TINT = { r: 1, g: 0.35, b: 0.35 };

const NO_WRONG: OrbWrongStateInput = { progress: 0, clockMs: 0, ...WRONG_TINT };

function wrongStateAt(elapsedMs: number): OrbWrongStateInput {
  'worklet';
  const rampMs = ORB_WRONG_RAMP_MS;
  const holdMs = Math.max(0, ORB_WRONG_FEEDBACK_MS - rampMs * 2);
  let progress = 0;
  if (elapsedMs < rampMs) {
    progress = easeOutCubic(clamp01(elapsedMs / rampMs));
  } else if (elapsedMs < rampMs + holdMs) {
    progress = 1;
  } else {
    progress = 1 - easeInOutCubic(clamp01((elapsedMs - rampMs - holdMs) / rampMs));
  }
  return {
    progress,
    clockMs: elapsedMs,
    r: WRONG_TINT.r,
    g: WRONG_TINT.g,
    b: WRONG_TINT.b,
  };
}

export function computeOrbActorPose(runtime: OrbActorRuntime, clockMs: number): OrbAnimState {
  'worklet';
  const target = resolveActorTargetGeometry(runtime, clockMs);
  const phase = runtime.phase;

  let enterProgress = 1;
  let burstProgress = 0;
  let idleElapsedMs = 0;
  let resolvedPhase = phase;

  if (phase === OrbPhase.Enter) {
    const elapsed = clockMs - runtime.enterStartMs - (runtime.enterDelayMs ?? 0);
    if (elapsed >= ORB_ENTER_DURATION_MS) {
      resolvedPhase = OrbPhase.Idle;
      idleElapsedMs = Math.max(0, clockMs - runtime.idleStartMs);
    } else {
      enterProgress = easeOutCubic(clamp01(elapsed / ORB_ENTER_DURATION_MS));
    }
  } else if (phase === OrbPhase.Burst) {
    const elapsed = clockMs - runtime.burstStartMs - (runtime.popDelayMs ?? 0);
    burstProgress = easeOutCubic(clamp01(elapsed / ORB_BURST_DURATION_MS));
    idleElapsedMs = Math.max(0, runtime.burstStartMs - runtime.idleStartMs);
  } else if (phase === OrbPhase.Idle) {
    idleElapsedMs = Math.max(0, clockMs - runtime.idleStartMs);
  }

  const wrong =
    runtime.wrongStartMs >= 0 ? wrongStateAt(clockMs - runtime.wrongStartMs) : NO_WRONG;

  const pose = computeOrbAnimState(resolvedPhase, enterProgress, burstProgress, idleElapsedMs, {
    originX: runtime.enterOriginX,
    originY: runtime.enterOriginY,
    targetCenterX: target.x,
    targetCenterY: target.y,
    targetDiameter: target.diameter,
    enterDelayMs: runtime.enterDelayMs ?? undefined,
    popDelayMs: runtime.popDelayMs ?? undefined,
  }, wrong);
  if (!runtime.visible) {
    pose.overallOpacity = 0;
  }
  return pose;
}

export function computeOrbActorPoses(
  runtimes: readonly OrbActorRuntime[],
  clockMs: number,
): OrbAnimState[] {
  'worklet';
  const poses = new Array<OrbAnimState>(runtimes.length);
  for (let i = 0; i < runtimes.length; i++) {
    poses[i] = computeOrbActorPose(runtimes[i]!, clockMs);
  }
  return poses;
}
