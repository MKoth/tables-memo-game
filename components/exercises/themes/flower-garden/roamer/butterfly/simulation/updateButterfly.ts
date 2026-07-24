import { FlightState, type ButterflySharedRuntime } from './types';
import {
  ROAMER_BUTTERFLY_ANGLE_LERP,
  ROAMER_BUTTERFLY_BOUNDARY_TURN_OFFSET,
  ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED,
  ROAMER_BUTTERFLY_SPEED_LERP_FACTOR,
  ROAMER_BUTTERFLY_WANDER_LERP,
} from '../config/butterflySimConfig';
import {
  clamp,
  cruiseDurationForPhase,
  idleDurationForPhase,
  lerp,
  lerpAngle,
  pickTargetBaseSpeed,
  pickWanderAngle,
} from './butterflySimHelpers';

export function updateButterfly(
  butterfly: ButterflySharedRuntime,
  dt: number,
  steerMinX: number,
  steerMaxX: number,
  steerMinY: number,
  steerMaxY: number,
  hardMinX: number,
  hardMaxX: number,
  hardMinY: number,
  hardMaxY: number,
  centerX: number,
  centerY: number,
): void {
  'worklet';
  const cfg = butterfly.spawn;
  const freq = cfg.wingLeftFreq;
  butterfly.wingPhase.value += freq * dt;

  if (butterfly.state.value === FlightState.FLYING_CRUISE) {
    const targetSpeed = butterfly.targetBaseSpeed.value;
    butterfly.speed.value = lerp(
      butterfly.speed.value,
      targetSpeed,
      Math.min(1, ROAMER_BUTTERFLY_SPEED_LERP_FACTOR * dt),
    );

    butterfly.x.value += Math.cos(butterfly.angle.value) * butterfly.speed.value * dt;
    butterfly.y.value += Math.sin(butterfly.angle.value) * butterfly.speed.value * dt;

    const nearEdge =
      butterfly.x.value < steerMinX ||
      butterfly.x.value > steerMaxX ||
      butterfly.y.value < steerMinY ||
      butterfly.y.value > steerMaxY;

    if (nearEdge) {
      const toCenter = Math.atan2(
        centerY - butterfly.y.value,
        centerX - butterfly.x.value,
      );
      const offset = Math.sin(cfg.phase * 5.1) * ROAMER_BUTTERFLY_BOUNDARY_TURN_OFFSET;
      const turnTarget = toCenter + offset;
      butterfly.angle.value = lerpAngle(
        butterfly.angle.value,
        turnTarget,
        Math.min(1, ROAMER_BUTTERFLY_ANGLE_LERP * dt),
      );
      butterfly.wanderAngle.value = turnTarget;
    } else {
      butterfly.angle.value = lerpAngle(
        butterfly.angle.value,
        butterfly.wanderAngle.value,
        Math.min(1, ROAMER_BUTTERFLY_WANDER_LERP * dt),
      );
    }

    butterfly.stateTimer.value -= dt;
    if (butterfly.stateTimer.value <= 0) {
      butterfly.state.value = FlightState.FLYING_IDLE;
      butterfly.speed.value = ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED;
      butterfly.prevAngle.value = butterfly.angle.value;
      butterfly.stateTimer.value = idleDurationForPhase(cfg.phase);
    }
  } else {
    butterfly.speed.value = ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED;
    const driftAngle = cfg.phase * 2.0 + butterfly.wingPhase.value * 0.3;
    butterfly.x.value += Math.cos(driftAngle) * ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED * dt;
    butterfly.y.value += Math.sin(driftAngle) * ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED * dt;

    butterfly.stateTimer.value -= dt;
    if (butterfly.stateTimer.value <= 0) {
      butterfly.state.value = FlightState.FLYING_CRUISE;
      butterfly.targetBaseSpeed.value = pickTargetBaseSpeed(cfg.phase);
      butterfly.stateTimer.value = cruiseDurationForPhase(cfg.phase);
      butterfly.wanderAngle.value = pickWanderAngle(butterfly.angle.value, cfg.phase);
    }
  }

  butterfly.x.value = clamp(butterfly.x.value, hardMinX, hardMaxX);
  butterfly.y.value = clamp(butterfly.y.value, hardMinY, hardMaxY);
}
