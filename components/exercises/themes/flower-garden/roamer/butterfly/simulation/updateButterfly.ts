import { FlightState, type ButterflySharedRuntime } from './types';
import {
  ROAMER_BUTTERFLY_ANGLE_LERP,
  ROAMER_BUTTERFLY_BASE_SPEED_MAX,
  ROAMER_BUTTERFLY_BASE_SPEED_MIN,
  ROAMER_BUTTERFLY_BOUNDARY_TURN_OFFSET,
  ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED,
  ROAMER_BUTTERFLY_IDLE_NOISE_AMPLITUDE,
  ROAMER_BUTTERFLY_IDLE_NOISE_FREQUENCY,
  ROAMER_BUTTERFLY_NOISE_AMPLITUDE_MAX,
  ROAMER_BUTTERFLY_NOISE_AMPLITUDE_MIN,
  ROAMER_BUTTERFLY_NOISE_FREQ_MAX,
  ROAMER_BUTTERFLY_NOISE_FREQ_MIN,
  ROAMER_BUTTERFLY_SPEED_LERP_FACTOR,
  ROAMER_BUTTERFLY_WANDER_LERP,
  ROAMER_BUTTERFLY_WING_FREQ_MAX,
  ROAMER_BUTTERFLY_WING_FREQ_MIN,
} from '../config/butterflySimConfig';
import {
  clamp,
  cruiseDurationForPhase,
  idleDurationForPhase,
  lerp,
  lerpAngle,
  pickErraticWanderAngle,
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
  const pc = butterfly.pathCoeff.value;

  const wingFreq = ROAMER_BUTTERFLY_WING_FREQ_MIN + pc * (ROAMER_BUTTERFLY_WING_FREQ_MAX - ROAMER_BUTTERFLY_WING_FREQ_MIN);
  butterfly.wingPhase.value += wingFreq * dt;

  if (butterfly.state.value === FlightState.FLYING_CRUISE) {
    const targetSpeed = ROAMER_BUTTERFLY_BASE_SPEED_MIN + pc * (ROAMER_BUTTERFLY_BASE_SPEED_MAX - ROAMER_BUTTERFLY_BASE_SPEED_MIN);
    butterfly.speed.value = lerp(
      butterfly.speed.value,
      targetSpeed,
      Math.min(1, ROAMER_BUTTERFLY_SPEED_LERP_FACTOR * dt),
    );

    butterfly.angle.value = lerpAngle(
      butterfly.angle.value,
      butterfly.wanderAngle.value,
      Math.min(1, ROAMER_BUTTERFLY_WANDER_LERP * dt),
    );

    const noiseFreq = ROAMER_BUTTERFLY_NOISE_FREQ_MIN + pc * (ROAMER_BUTTERFLY_NOISE_FREQ_MAX - ROAMER_BUTTERFLY_NOISE_FREQ_MIN);
    butterfly.noisePhase.value += noiseFreq * dt;
    const noiseAmp = ROAMER_BUTTERFLY_NOISE_AMPLITUDE_MIN + pc * (ROAMER_BUTTERFLY_NOISE_AMPLITUDE_MAX - ROAMER_BUTTERFLY_NOISE_AMPLITUDE_MIN);
    const noiseOffset = Math.sin(butterfly.noisePhase.value) * noiseAmp * dt;
    const noisePerpX = Math.cos(butterfly.angle.value);
    const noisePerpY = Math.sin(butterfly.angle.value);

    const moveAngle = butterfly.angle.value - Math.PI / 2;
    butterfly.x.value +=
      Math.cos(moveAngle) * butterfly.speed.value * dt + noisePerpX * noiseOffset;
    butterfly.y.value +=
      Math.sin(moveAngle) * butterfly.speed.value * dt + noisePerpY * noiseOffset;

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
      const turnTarget = toCenter + Math.PI / 2 +
        Math.sin(cfg.phase * 5.1) * ROAMER_BUTTERFLY_BOUNDARY_TURN_OFFSET;
      butterfly.angle.value = lerpAngle(
        butterfly.angle.value,
        turnTarget,
        Math.min(1, ROAMER_BUTTERFLY_ANGLE_LERP * dt),
      );
      butterfly.wanderAngle.value = turnTarget;
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
    butterfly.idleNoisePhase.value += ROAMER_BUTTERFLY_IDLE_NOISE_FREQUENCY * dt;
    const idleAmp = ROAMER_BUTTERFLY_IDLE_NOISE_AMPLITUDE * dt;
    const idleNoiseX = Math.sin(butterfly.idleNoisePhase.value) * idleAmp;
    const idleNoiseY = Math.sin(butterfly.idleNoisePhase.value * 1.7 + 1.3) * idleAmp;
    const driftAngle = cfg.phase * 2.0 + butterfly.wingPhase.value * 0.3;
    butterfly.x.value += Math.cos(driftAngle) * ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED * dt + idleNoiseX;
    butterfly.y.value += Math.sin(driftAngle) * ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED * dt + idleNoiseY;

    butterfly.stateTimer.value -= dt;
    if (butterfly.stateTimer.value <= 0) {
      butterfly.pathCoeff.value = 0.5 + 0.5 * Math.sin(
        butterfly.wingPhase.value * 3.17 + cfg.phase * 5.23,
      );
      butterfly.state.value = FlightState.FLYING_CRUISE;
      butterfly.stateTimer.value = cruiseDurationForPhase(cfg.phase);
      butterfly.wanderAngle.value = pickErraticWanderAngle(
        butterfly.angle.value,
        cfg.phase,
        0,
      );
    }
  }

  butterfly.x.value = clamp(butterfly.x.value, hardMinX, hardMaxX);
  butterfly.y.value = clamp(butterfly.y.value, hardMinY, hardMaxY);
}
