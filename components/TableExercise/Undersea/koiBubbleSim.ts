import type { FishRuntime } from './koiFishTypes';
import {
  BUBBLE_FISH_CLIP_INSET,
  BUBBLE_FISH_SCALE,
  BUBBLE_FISH_SWIM_MARGIN_RATIO,
  BUBBLE_FISH_VISUAL_REACH_MULT,
} from './bubbleAnimPresets';

const SWIMMING = 0;
const IDLE = 1;

const BASE_SPEED_MIN = 50;
export const BASE_SPEED_MAX = 670;

const ESCAPE_ARRIVAL_THRESHOLD = 48;
const ESCAPE_ANGLE_LERP = 10.0;
const ESCAPE_SCREEN_MARGIN = 8;
const SPEED_PICK_BIAS = 15.5;
const SWIM_SPEED_SHADER_MIN = 2.5;
const SWIM_SPEED_SHADER_MAX = 90.0;
const SWIM_DURATION_MIN = 0.1;
const SWIM_DURATION_MAX = 12.0;
const SWIM_DURATION_JITTER = 1.5;
const IDLE_DURATION_BASE = 2.0;
const IDLE_DURATION_JITTER = 0.6;
const IDLE_RETRACT_AMPLITUDE_RATIO = 0.3;
const AMPLITUDE_LERP = 3.5;
const ANGLE_LERP = 2.5;
const TURN_ARC_LERP = 3.5;
const TURN_ARC_MAX = 0.4;
const WANDER_LERP = 0.6;
const BOUNDARY_MARGIN_RATIO = 0.18;
const BOUNDARY_TURN_OFFSET = Math.PI * 0.25;

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

function normalizeAngle(angle: number): number {
  'worklet';
  const twoPi = Math.PI * 2;
  let a = angle % twoPi;
  if (a > Math.PI) {
    a -= twoPi;
  }
  if (a < -Math.PI) {
    a += twoPi;
  }
  return a;
}

function lerpAngle(from: number, to: number, t: number): number {
  'worklet';
  const delta = normalizeAngle(to - from);
  return from + delta * t;
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

function pickRandomBaseSpeed(): number {
  'worklet';
  const t = Math.pow(Math.random(), SPEED_PICK_BIAS);
  return BASE_SPEED_MIN + t * (BASE_SPEED_MAX - BASE_SPEED_MIN);
}

function swimSpeedForForwardSpeed(speed: number): number {
  'worklet';
  const t = clamp((speed - BASE_SPEED_MIN) / (BASE_SPEED_MAX - BASE_SPEED_MIN), 0, 1);
  return SWIM_SPEED_SHADER_MIN + t * (SWIM_SPEED_SHADER_MAX - SWIM_SPEED_SHADER_MIN);
}

function idleDurationForPhase(phase: number): number {
  'worklet';
  return IDLE_DURATION_BASE + (phase % IDLE_DURATION_JITTER);
}

function swimDurationForSpeed(speed: number, phase: number): number {
  'worklet';
  const t = clamp((speed - BASE_SPEED_MIN) / (BASE_SPEED_MAX - BASE_SPEED_MIN), 0, 1);
  const base = SWIM_DURATION_MAX - t * (SWIM_DURATION_MAX - SWIM_DURATION_MIN);
  return base + (phase % SWIM_DURATION_JITTER);
}

function pickWanderAngle(currentAngle: number, phase: number): number {
  'worklet';
  const sign = Math.sin(phase * 3.7) > 0 ? 1 : -1;
  const deviation = (0.35 + Math.abs(Math.sin(phase * 11.3)) * 0.8) * Math.PI * sign;
  return currentAngle + deviation;
}

function finSquashFromPhase(phase: number, base: number, amp: number): number {
  'worklet';
  return base + amp * (0.5 - 0.5 * Math.cos(phase));
}

function rerollFinSide(fish: FishRuntime, side: 'left' | 'right'): void {
  'worklet';
  const cfg = fish.config;
  const variant = Math.random() < cfg.finThinProbability ? 1 : 0;
  const base = variant === 1 ? cfg.finThinFreqBase : cfg.finRetractFreqBase;
  const jitter = variant === 1 ? cfg.finThinFreqJitter : cfg.finRetractFreqJitter;
  const freq = base + (Math.random() * 2 - 1) * jitter;
  const finPhase = Math.random() * Math.PI * 2;
  const rerollDelay =
    cfg.finBehaviorRerollInterval <= 0
      ? Number.MAX_VALUE
      : cfg.finBehaviorRerollInterval + Math.random() * cfg.finBehaviorRerollJitter;

  if (side === 'left') {
    fish.finVariantLeft.value = variant;
    fish.finFreqLeft.value = freq;
    fish.finPhaseLeft.value = finPhase;
    fish.finSquashLeft.value = finSquashFromPhase(finPhase, cfg.finSquashBase, cfg.finSquashAmp);
    fish.finRerollTimerLeft.value = rerollDelay;
    return;
  }

  fish.finVariantRight.value = variant;
  fish.finFreqRight.value = freq;
  fish.finPhaseRight.value = finPhase;
  fish.finSquashRight.value = finSquashFromPhase(finPhase, cfg.finSquashBase, cfg.finSquashAmp);
  fish.finRerollTimerRight.value = rerollDelay;
}

function updateFinBehavior(fish: FishRuntime, dt: number): void {
  'worklet';
  const { finSquashBase, finSquashAmp, finBehaviorRerollInterval } = fish.config;

  if (finBehaviorRerollInterval > 0) {
    fish.finRerollTimerLeft.value -= dt;
    if (fish.finRerollTimerLeft.value <= 0) {
      rerollFinSide(fish, 'left');
    }

    fish.finRerollTimerRight.value -= dt;
    if (fish.finRerollTimerRight.value <= 0) {
      rerollFinSide(fish, 'right');
    }
  }

  fish.finPhaseLeft.value += dt * fish.finFreqLeft.value;
  fish.finPhaseRight.value += dt * fish.finFreqRight.value;
  fish.finSquashLeft.value = finSquashFromPhase(
    fish.finPhaseLeft.value,
    finSquashBase,
    finSquashAmp,
  );
  fish.finSquashRight.value = finSquashFromPhase(
    fish.finPhaseRight.value,
    finSquashBase,
    finSquashAmp,
  );
}

function updateTurnArc(fish: FishRuntime, dt: number): void {
  'worklet';
  const omega = normalizeAngle(fish.angle.value - fish.prevAngle.value) / dt;
  fish.prevAngle.value = fish.angle.value;
  const turnTarget = clamp(
    -omega * fish.config.turnArcGain,
    -TURN_ARC_MAX,
    TURN_ARC_MAX,
  );
  fish.turnArc.value = lerp(
    fish.turnArc.value,
    turnTarget,
    Math.min(1, TURN_ARC_LERP * dt),
  );
}

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
  if (dist > hardRadius && dist > 0.001) {
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
  const hardRadius = Math.max(fishBodyInset * 0.25, clipRadius - edgeMargin - bodyReach);
  const steerRadius = hardRadius * (1 - BOUNDARY_MARGIN_RATIO);
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
    fish.state.value === SWIMMING
      ? swimSpeedForForwardSpeed(fish.targetBaseSpeed.value)
      : swimSpeedForForwardSpeed(fish.speed.value);
  fish.wavePhase.value = (fish.wavePhase.value + waveFreq * dt) % (Math.PI * 2);

  if (fish.state.value === SWIMMING) {
    updateTurnArc(fish, dt);
  } else {
    fish.turnArc.value = lerp(fish.turnArc.value, 0, Math.min(1, TURN_ARC_LERP * dt));
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

  if (fish.state.value === SWIMMING) {
    fish.amplitude.value = lerp(
      fish.amplitude.value,
      cfg.targetAmplitude,
      Math.min(1, AMPLITUDE_LERP * dt),
    );

    const swimSpeed = fish.targetBaseSpeed.value;
    fish.speed.value = lerp(fish.speed.value, swimSpeed, Math.min(1, 4 * dt));

    fish.x.value += Math.cos(fish.angle.value) * fish.speed.value * dt;
    fish.y.value += Math.sin(fish.angle.value) * fish.speed.value * dt;

    const dx = fish.x.value - centerX;
    const dy = fish.y.value - centerY;
    const dist = Math.hypot(dx, dy);
    const nearEdge = dist > steerRadius;

    if (nearEdge) {
      const toCenter = Math.atan2(centerY - fish.y.value, centerX - fish.x.value);
      const offset = Math.sin(cfg.phase * 5.1) * BOUNDARY_TURN_OFFSET;
      const turnTarget = toCenter + offset;
      fish.angle.value = lerpAngle(fish.angle.value, turnTarget, Math.min(1, ANGLE_LERP * dt));
      fish.wanderAngle.value = turnTarget;
    } else {
      fish.angle.value = lerpAngle(
        fish.angle.value,
        fish.wanderAngle.value,
        Math.min(1, WANDER_LERP * dt),
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
      fish.state.value = IDLE;
      fish.wasNearEdge.value = false;
      fish.speed.value = BASE_SPEED_MIN;
      fish.prevAngle.value = fish.angle.value;
      fish.turnArc.value = 0;
      fish.stateTimer.value = idleDurationForPhase(cfg.phase);
    }
  } else {
    fish.amplitude.value = lerp(
      fish.amplitude.value,
      -cfg.targetAmplitude * IDLE_RETRACT_AMPLITUDE_RATIO,
      Math.min(1, AMPLITUDE_LERP * dt),
    );

    fish.speed.value = BASE_SPEED_MIN;
    const retractAngle = fish.angle.value + Math.PI;
    fish.x.value += Math.cos(retractAngle) * BASE_SPEED_MIN * dt;
    fish.y.value += Math.sin(retractAngle) * BASE_SPEED_MIN * dt;

    fish.stateTimer.value -= dt;
    if (fish.stateTimer.value <= 0) {
      fish.state.value = SWIMMING;
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
): void {
  'worklet';
  const margin = Math.max(ESCAPE_SCREEN_MARGIN, fishBodyInset * 0.5);
  fish.x.value = clamp(fish.x.value, margin, screenW - margin);
  // Bottom and sides only — no top clamp so the fish can exit upward.
  fish.y.value = Math.min(fish.y.value, screenH - margin);
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
): boolean {
  'worklet';
  const cfg = fish.config;
  const SWIMMING = 0;

  fish.state.value = SWIMMING;
  fish.stateTimer.value = 999;
  fish.targetBaseSpeed.value = speed;
  fish.speed.value = lerp(fish.speed.value, speed, Math.min(1, 8 * dt));
  fish.amplitude.value = lerp(
    fish.amplitude.value,
    cfg.targetAmplitude,
    Math.min(1, AMPLITUDE_LERP * dt),
  );

  const dx = targetX - fish.x.value;
  const dy = targetY - fish.y.value;
  const dist = Math.hypot(dx, dy);
  const targetAngle = Math.atan2(dy, dx);
  fish.angle.value = lerpAngle(fish.angle.value, targetAngle, Math.min(1, ESCAPE_ANGLE_LERP * dt));
  fish.wanderAngle.value = targetAngle;
  fish.wasNearEdge.value = false;
  fish.turnArc.value = lerp(fish.turnArc.value, 0, Math.min(1, TURN_ARC_LERP * dt));
  fish.prevAngle.value = fish.angle.value;

  fish.x.value += Math.cos(fish.angle.value) * fish.speed.value * dt;
  fish.y.value += Math.sin(fish.angle.value) * fish.speed.value * dt;

  clampFishEscapeToScreen(fish, fishBodyInset, screenW, screenH);
  advanceFishCosmetics(fish, dt);
  return dist <= ESCAPE_ARRIVAL_THRESHOLD;
}
