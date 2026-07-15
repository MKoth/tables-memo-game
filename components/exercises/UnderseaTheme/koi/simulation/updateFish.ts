import {
  KOI_AMPLITUDE_LERP,
  KOI_ANGLE_LERP,
  KOI_BASE_SPEED_MIN,
  KOI_BOUNDARY_TURN_OFFSET,
  KOI_FISH_STATE_IDLE,
  KOI_FISH_STATE_SWIMMING,
  KOI_IDLE_RETRACT_AMPLITUDE_RATIO,
  KOI_SPEED_LERP_FACTOR,
  KOI_TURN_ARC_LERP,
  KOI_WANDER_LERP,
} from '../config/koiSimConfig';
import type { FishRuntime } from './types';
import {
  clamp,
  idleDurationForPhase,
  lerp,
  lerpAngle,
  pickWanderAngle,
  swimDurationForSpeed,
  swimSpeedForForwardSpeed,
  updateFinBehavior,
  updateTurnArc,
} from './fishSimCommon';
import { rollTargetBaseSpeed } from './fishSimSpeed';

export function updateFish(
  fish: FishRuntime,
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
  onSpeedIncrease?: () => void,
): void {
  'worklet';
  const cfg = fish.config;

  if (fish.state.value === KOI_FISH_STATE_SWIMMING) {
    fish.amplitude.value = lerp(
      fish.amplitude.value,
      cfg.targetAmplitude,
      Math.min(1, KOI_AMPLITUDE_LERP * dt),
    );

    const swimSpeed = fish.targetBaseSpeed.value;
    fish.speed.value = lerp(
      fish.speed.value,
      swimSpeed,
      Math.min(1, KOI_SPEED_LERP_FACTOR * dt),
    );

    fish.x.value += Math.cos(fish.angle.value) * fish.speed.value * dt;
    fish.y.value += Math.sin(fish.angle.value) * fish.speed.value * dt;

    const nearEdge =
      fish.x.value < steerMinX ||
      fish.x.value > steerMaxX ||
      fish.y.value < steerMinY ||
      fish.y.value > steerMaxY;

    if (nearEdge) {
      const toCenter = Math.atan2(centerY - fish.y.value, centerX - fish.x.value);
      const offset = Math.sin(cfg.phase * 5.1) * KOI_BOUNDARY_TURN_OFFSET;
      const turnTarget = toCenter + offset;
      fish.angle.value = lerpAngle(fish.angle.value, turnTarget, Math.min(1, KOI_ANGLE_LERP * dt));
      fish.wanderAngle.value = turnTarget;
    } else {
      fish.angle.value = lerpAngle(
        fish.angle.value,
        fish.wanderAngle.value,
        Math.min(1, KOI_WANDER_LERP * dt),
      );

      if (fish.wasNearEdge.value) {
        rollTargetBaseSpeed(fish, onSpeedIncrease);
        fish.stateTimer.value = swimDurationForSpeed(fish.targetBaseSpeed.value, cfg.phase);
        fish.wanderAngle.value = pickWanderAngle(fish.angle.value, cfg.phase);
      }
    }

    fish.wasNearEdge.value = nearEdge;

    fish.stateTimer.value -= dt;
    if (fish.stateTimer.value <= 0) {
      fish.state.value = KOI_FISH_STATE_IDLE;
      fish.wasNearEdge.value = false;
      fish.speed.value = KOI_BASE_SPEED_MIN;
      fish.prevAngle.value = fish.angle.value;
      fish.turnArc.value = 0;
      fish.stateTimer.value = idleDurationForPhase(cfg.phase);
    }
  } else {
    fish.amplitude.value = lerp(
      fish.amplitude.value,
      -cfg.targetAmplitude * KOI_IDLE_RETRACT_AMPLITUDE_RATIO,
      Math.min(1, KOI_AMPLITUDE_LERP * dt),
    );

    fish.speed.value = KOI_BASE_SPEED_MIN;
    const retractAngle = fish.angle.value + Math.PI;
    fish.x.value += Math.cos(retractAngle) * KOI_BASE_SPEED_MIN * dt;
    fish.y.value += Math.sin(retractAngle) * KOI_BASE_SPEED_MIN * dt;

    fish.stateTimer.value -= dt;
    if (fish.stateTimer.value <= 0) {
      fish.state.value = KOI_FISH_STATE_SWIMMING;
      fish.wasNearEdge.value = false;
      rollTargetBaseSpeed(fish, onSpeedIncrease);
      fish.stateTimer.value = swimDurationForSpeed(fish.targetBaseSpeed.value, cfg.phase);
      fish.wanderAngle.value = pickWanderAngle(fish.angle.value, cfg.phase);
    }
  }

  fish.x.value = clamp(fish.x.value, hardMinX, hardMaxX);
  fish.y.value = clamp(fish.y.value, hardMinY, hardMaxY);

  const waveFreq =
    fish.state.value === KOI_FISH_STATE_SWIMMING
      ? swimSpeedForForwardSpeed(fish.targetBaseSpeed.value)
      : swimSpeedForForwardSpeed(fish.speed.value);
  fish.wavePhase.value = (fish.wavePhase.value + waveFreq * dt) % (Math.PI * 2);

  if (fish.state.value === KOI_FISH_STATE_SWIMMING) {
    updateTurnArc(fish, dt);
  } else {
    fish.turnArc.value = lerp(fish.turnArc.value, 0, Math.min(1, KOI_TURN_ARC_LERP * dt));
    fish.prevAngle.value = fish.angle.value;
  }
  updateFinBehavior(fish, dt);
}
