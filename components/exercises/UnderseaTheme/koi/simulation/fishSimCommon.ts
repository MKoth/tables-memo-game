import {
  KOI_BASE_SPEED_MAX,
  KOI_BASE_SPEED_MIN,
  KOI_IDLE_DURATION_BASE,
  KOI_IDLE_DURATION_JITTER,
  KOI_SPEED_PICK_BIAS,
  KOI_SWIM_DURATION_JITTER,
  KOI_SWIM_DURATION_MAX,
  KOI_SWIM_DURATION_MIN,
  KOI_SWIM_SPEED_SHADER_MAX,
  KOI_SWIM_SPEED_SHADER_MIN,
  KOI_TURN_ARC_LERP,
  KOI_TURN_ARC_MAX,
} from '../config/koiSimConfig';
import type { FishRuntime } from './types';

export function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

export function normalizeAngle(angle: number): number {
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

export function lerpAngle(from: number, to: number, t: number): number {
  'worklet';
  const delta = normalizeAngle(to - from);
  return from + delta * t;
}

export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export function pickRandomBaseSpeed(): number {
  'worklet';
  const t = Math.pow(Math.random(), KOI_SPEED_PICK_BIAS);
  return KOI_BASE_SPEED_MIN + t * (KOI_BASE_SPEED_MAX - KOI_BASE_SPEED_MIN);
}

export function swimSpeedForForwardSpeed(speed: number): number {
  'worklet';
  const t = clamp((speed - KOI_BASE_SPEED_MIN) / (KOI_BASE_SPEED_MAX - KOI_BASE_SPEED_MIN), 0, 1);
  return KOI_SWIM_SPEED_SHADER_MIN + t * (KOI_SWIM_SPEED_SHADER_MAX - KOI_SWIM_SPEED_SHADER_MIN);
}

export function idleDurationForPhase(phase: number): number {
  'worklet';
  return KOI_IDLE_DURATION_BASE + (phase % KOI_IDLE_DURATION_JITTER);
}

export function swimDurationForSpeed(speed: number, phase: number): number {
  'worklet';
  const t = clamp((speed - KOI_BASE_SPEED_MIN) / (KOI_BASE_SPEED_MAX - KOI_BASE_SPEED_MIN), 0, 1);
  const base = KOI_SWIM_DURATION_MAX - t * (KOI_SWIM_DURATION_MAX - KOI_SWIM_DURATION_MIN);
  return base + (phase % KOI_SWIM_DURATION_JITTER);
}

export function pickWanderAngle(currentAngle: number, phase: number): number {
  'worklet';
  const sign = Math.sin(phase * 3.7) > 0 ? 1 : -1;
  const deviation = (0.35 + Math.abs(Math.sin(phase * 11.3)) * 0.8) * Math.PI * sign;
  return currentAngle + deviation;
}

export function finSquashFromPhase(phase: number, base: number, amp: number): number {
  'worklet';
  return base + amp * (0.5 - 0.5 * Math.cos(phase));
}

export function rerollFinSide(fish: FishRuntime, side: 'left' | 'right'): void {
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

export function updateFinBehavior(fish: FishRuntime, dt: number): void {
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

export function updateTurnArc(fish: FishRuntime, dt: number): void {
  'worklet';
  const omega = normalizeAngle(fish.angle.value - fish.prevAngle.value) / dt;
  fish.prevAngle.value = fish.angle.value;
  const turnTarget = clamp(
    -omega * fish.config.turnArcGain,
    -KOI_TURN_ARC_MAX,
    KOI_TURN_ARC_MAX,
  );
  fish.turnArc.value = lerp(
    fish.turnArc.value,
    turnTarget,
    Math.min(1, KOI_TURN_ARC_LERP * dt),
  );
}

export {
  KOI_AMPLITUDE_LERP,
  KOI_ANGLE_LERP,
  KOI_BASE_SPEED_MAX,
  KOI_BASE_SPEED_MIN,
  KOI_BOUNDARY_TURN_OFFSET,
  KOI_FISH_STATE_IDLE,
  KOI_FISH_STATE_SWIMMING,
  KOI_IDLE_RETRACT_AMPLITUDE_RATIO,
  KOI_TURN_ARC_LERP,
  KOI_WANDER_LERP,
} from '../config/koiSimConfig';
