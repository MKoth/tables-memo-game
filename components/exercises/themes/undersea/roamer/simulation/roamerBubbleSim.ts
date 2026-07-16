import type { FishRuntime } from './types';
import {
  BUBBLE_FISH_CLIP_INSET,
  BUBBLE_FISH_SCALE,
  BUBBLE_FISH_SWIM_MARGIN_RATIO,
  BUBBLE_FISH_VISUAL_REACH_MULT,
} from '../bubbles/bubbleAnimPresets';
import {
  ROAMER_BUBBLE_CLAMP_EPSILON,
  ROAMER_BUBBLE_ESCAPE_ANGLE_LERP,
  ROAMER_BUBBLE_ESCAPE_ARRIVAL_THRESHOLD,
  ROAMER_BUBBLE_ESCAPE_BODY_MARGIN_RATIO,
  ROAMER_BUBBLE_ESCAPE_SCREEN_MARGIN,
  ROAMER_BUBBLE_ESCAPE_SPEED_LERP_FACTOR,
  ROAMER_BUBBLE_ESCAPE_STATE_TIMER,
  ROAMER_BUBBLE_HARD_RADIUS_MIN_BODY_RATIO,
} from '../config/roamerBubbleSimConfig';
import {
  ROAMER_AMPLITUDE_LERP,
  ROAMER_ANGLE_LERP,
  ROAMER_BASE_SPEED_MIN,
  ROAMER_BOUNDARY_MARGIN_RATIO,
  ROAMER_BOUNDARY_TURN_OFFSET,
  ROAMER_FISH_STATE_IDLE,
  ROAMER_FISH_STATE_SWIMMING,
  ROAMER_IDLE_RETRACT_AMPLITUDE_RATIO,
  ROAMER_SPEED_LERP_FACTOR,
  ROAMER_TURN_ARC_LERP,
  ROAMER_WANDER_LERP,
} from '../config/roamerSimConfig';
import {
  clamp,
  idleDurationForPhase,
  lerp,
  lerpAngle,
  pickRandomBaseSpeed,
  pickWanderAngle,
  swimDurationForSpeed,
  swimSpeedForForwardSpeed,
  updateFinBehavior,
  updateTurnArc,
} from './fishSimCommon';

export { ROAMER_BASE_SPEED_MAX } from '../config/roamerSimConfig';

function clampToCircle(
  fish: FishRuntime,
  centerX: number,
  centerY: number,
  hardRadius: number,
): void {
  'worklet';
  const dx = fish.x.value - centerX;
  const dy = fish.y.value - centerY;
  const dist = Math.hypot(dx, dy);
  if (dist > hardRadius && dist > ROAMER_BUBBLE_CLAMP_EPSILON) {
    fish.x.value = centerX + (dx / dist) * hardRadius;
    fish.y.value = centerY + (dy / dist) * hardRadius;
  }
}

function bubbleSwimRadii(
  bubbleRadius: number,
  fishBodyInset: number,
): { steerRadius: number; hardRadius: number } {
  'worklet';
  const clipRadius = bubbleRadius * (1 - BUBBLE_FISH_CLIP_INSET);
  const edgeMargin = bubbleRadius * BUBBLE_FISH_SWIM_MARGIN_RATIO;
  const bodyReach = fishBodyInset * BUBBLE_FISH_SCALE * BUBBLE_FISH_VISUAL_REACH_MULT;
  const hardRadius = Math.max(
    fishBodyInset * ROAMER_BUBBLE_HARD_RADIUS_MIN_BODY_RATIO,
    clipRadius - edgeMargin - bodyReach,
  );
  const steerRadius = hardRadius * (1 - ROAMER_BOUNDARY_MARGIN_RATIO);
  return { steerRadius, hardRadius };
}

export function applyEnterFishPosition(
  fish: FishRuntime,
  originX: number,
  originY: number,
  centerX: number,
  centerY: number,
  enterProgress: number,
): void {
  'worklet';
  fish.x.value = lerp(originX, centerX, enterProgress);
  fish.y.value = lerp(originY, centerY, enterProgress);
}

export function advanceFishCosmetics(fish: FishRuntime, dt: number): void {
  'worklet';
  const waveFreq =
    fish.state.value === ROAMER_FISH_STATE_SWIMMING
      ? swimSpeedForForwardSpeed(fish.targetBaseSpeed.value)
      : swimSpeedForForwardSpeed(fish.speed.value);
  fish.wavePhase.value = (fish.wavePhase.value + waveFreq * dt) % (Math.PI * 2);

  if (fish.state.value === ROAMER_FISH_STATE_SWIMMING) {
    updateTurnArc(fish, dt);
  } else {
    fish.turnArc.value = lerp(fish.turnArc.value, 0, Math.min(1, ROAMER_TURN_ARC_LERP * dt));
    fish.prevAngle.value = fish.angle.value;
  }
  updateFinBehavior(fish, dt);
}

export function updateFishInBubble(
  fish: FishRuntime,
  dt: number,
  centerX: number,
  centerY: number,
  bubbleRadius: number,
  fishBodyInset: number,
): void {
  'worklet';
  const cfg = fish.config;
  const { steerRadius, hardRadius } = bubbleSwimRadii(bubbleRadius, fishBodyInset);

  if (fish.state.value === ROAMER_FISH_STATE_SWIMMING) {
    fish.amplitude.value = lerp(
      fish.amplitude.value,
      cfg.targetAmplitude,
      Math.min(1, ROAMER_AMPLITUDE_LERP * dt),
    );

    const swimSpeed = fish.targetBaseSpeed.value;
    fish.speed.value = lerp(
      fish.speed.value,
      swimSpeed,
      Math.min(1, ROAMER_SPEED_LERP_FACTOR * dt),
    );

    fish.x.value += Math.cos(fish.angle.value) * fish.speed.value * dt;
    fish.y.value += Math.sin(fish.angle.value) * fish.speed.value * dt;

    const dx = fish.x.value - centerX;
    const dy = fish.y.value - centerY;
    const dist = Math.hypot(dx, dy);
    const nearEdge = dist > steerRadius;

    if (nearEdge) {
      const toCenter = Math.atan2(centerY - fish.y.value, centerX - fish.x.value);
      const offset = Math.sin(cfg.phase * 5.1) * ROAMER_BOUNDARY_TURN_OFFSET;
      const turnTarget = toCenter + offset;
      fish.angle.value = lerpAngle(fish.angle.value, turnTarget, Math.min(1, ROAMER_ANGLE_LERP * dt));
      fish.wanderAngle.value = turnTarget;
    } else {
      fish.angle.value = lerpAngle(
        fish.angle.value,
        fish.wanderAngle.value,
        Math.min(1, ROAMER_WANDER_LERP * dt),
      );

      if (fish.wasNearEdge.value) {
        fish.targetBaseSpeed.value = pickRandomBaseSpeed();
        fish.stateTimer.value = swimDurationForSpeed(fish.targetBaseSpeed.value, cfg.phase);
        fish.wanderAngle.value = pickWanderAngle(fish.angle.value, cfg.phase);
      }
    }

    fish.wasNearEdge.value = nearEdge;

    fish.stateTimer.value -= dt;
    if (fish.stateTimer.value <= 0) {
      fish.state.value = ROAMER_FISH_STATE_IDLE;
      fish.wasNearEdge.value = false;
      fish.speed.value = ROAMER_BASE_SPEED_MIN;
      fish.prevAngle.value = fish.angle.value;
      fish.turnArc.value = 0;
      fish.stateTimer.value = idleDurationForPhase(cfg.phase);
    }
  } else {
    fish.amplitude.value = lerp(
      fish.amplitude.value,
      -cfg.targetAmplitude * ROAMER_IDLE_RETRACT_AMPLITUDE_RATIO,
      Math.min(1, ROAMER_AMPLITUDE_LERP * dt),
    );

    fish.speed.value = ROAMER_BASE_SPEED_MIN;
    const retractAngle = fish.angle.value + Math.PI;
    fish.x.value += Math.cos(retractAngle) * ROAMER_BASE_SPEED_MIN * dt;
    fish.y.value += Math.sin(retractAngle) * ROAMER_BASE_SPEED_MIN * dt;

    fish.stateTimer.value -= dt;
    if (fish.stateTimer.value <= 0) {
      fish.state.value = ROAMER_FISH_STATE_SWIMMING;
      fish.wasNearEdge.value = false;
      fish.targetBaseSpeed.value = pickRandomBaseSpeed();
      fish.stateTimer.value = swimDurationForSpeed(fish.targetBaseSpeed.value, cfg.phase);
      fish.wanderAngle.value = pickWanderAngle(fish.angle.value, cfg.phase);
    }
  }

  clampToCircle(fish, centerX, centerY, hardRadius);
  advanceFishCosmetics(fish, dt);
}

function clampFishEscapeToScreen(
  fish: FishRuntime,
  fishBodyInset: number,
  screenW: number,
  screenH: number,
  exitEdge: number,
): void {
  'worklet';
  const margin = Math.max(
    ROAMER_BUBBLE_ESCAPE_SCREEN_MARGIN,
    fishBodyInset * ROAMER_BUBBLE_ESCAPE_BODY_MARGIN_RATIO,
  );
  // exitEdge: 0=top, 1=bottom, 2=left, 3=right — leave the exit edge unclamped.
  if (exitEdge === 0) {
    fish.x.value = clamp(fish.x.value, margin, screenW - margin);
    fish.y.value = Math.min(fish.y.value, screenH - margin);
    return;
  }
  if (exitEdge === 1) {
    fish.x.value = clamp(fish.x.value, margin, screenW - margin);
    fish.y.value = Math.max(fish.y.value, margin);
    return;
  }
  if (exitEdge === 2) {
    fish.y.value = clamp(fish.y.value, margin, screenH - margin);
    fish.x.value = Math.min(fish.x.value, screenW - margin);
    return;
  }
  fish.y.value = clamp(fish.y.value, margin, screenH - margin);
  fish.x.value = Math.max(fish.x.value, margin);
}

/** Directed swim toward a target at fixed speed; returns true when within arrival threshold. */
export function updateFishDirectedEscape(
  fish: FishRuntime,
  dt: number,
  targetX: number,
  targetY: number,
  speed: number,
  fishBodyInset: number,
  screenW: number,
  screenH: number,
  exitEdge: number,
): boolean {
  'worklet';
  const cfg = fish.config;

  fish.state.value = ROAMER_FISH_STATE_SWIMMING;
  fish.stateTimer.value = ROAMER_BUBBLE_ESCAPE_STATE_TIMER;
  fish.targetBaseSpeed.value = speed;
  fish.speed.value = lerp(
    fish.speed.value,
    speed,
    Math.min(1, ROAMER_BUBBLE_ESCAPE_SPEED_LERP_FACTOR * dt),
  );
  fish.amplitude.value = lerp(
    fish.amplitude.value,
    cfg.targetAmplitude,
    Math.min(1, ROAMER_AMPLITUDE_LERP * dt),
  );

  const dx = targetX - fish.x.value;
  const dy = targetY - fish.y.value;
  const dist = Math.hypot(dx, dy);
  const targetAngle = Math.atan2(dy, dx);
  fish.angle.value = lerpAngle(
    fish.angle.value,
    targetAngle,
    Math.min(1, ROAMER_BUBBLE_ESCAPE_ANGLE_LERP * dt),
  );
  fish.wanderAngle.value = targetAngle;
  fish.wasNearEdge.value = false;
  fish.turnArc.value = lerp(fish.turnArc.value, 0, Math.min(1, ROAMER_TURN_ARC_LERP * dt));
  fish.prevAngle.value = fish.angle.value;

  fish.x.value += Math.cos(fish.angle.value) * fish.speed.value * dt;
  fish.y.value += Math.sin(fish.angle.value) * fish.speed.value * dt;

  clampFishEscapeToScreen(fish, fishBodyInset, screenW, screenH, exitEdge);
  advanceFishCosmetics(fish, dt);
  return dist <= ROAMER_BUBBLE_ESCAPE_ARRIVAL_THRESHOLD;
}
