import {
  ROAMER_BUTTERFLY_BASE_SPEED_MAX,
  ROAMER_BUTTERFLY_BASE_SPEED_MIN,
  ROAMER_BUTTERFLY_CRUISE_DURATION_JITTER,
  ROAMER_BUTTERFLY_CRUISE_DURATION_MAX,
  ROAMER_BUTTERFLY_CRUISE_DURATION_MIN,
  ROAMER_BUTTERFLY_IDLE_DURATION_BASE,
  ROAMER_BUTTERFLY_IDLE_DURATION_JITTER,
  ROAMER_BUTTERFLY_SPEED_PICK_BIAS,
} from '../config/butterflySimConfig';

const TWO_PI = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

export function normalizeAngle(angle: number): number {
  'worklet';
  let a = angle % TWO_PI;
  if (a > Math.PI) {
    a -= TWO_PI;
  }
  if (a < -Math.PI) {
    a += TWO_PI;
  }
  return a;
}

export function lerpAngle(from: number, to: number, t: number): number {
  'worklet';
  const delta = normalizeAngle(to - from);
  return from + delta * t;
}

export function pickWanderAngle(currentAngle: number, phase: number): number {
  'worklet';
  const sign = Math.sin(phase * 3.7) >= 0 ? 1 : -1;
  const deviation = (0.3 + Math.abs(Math.sin(phase * 11.3)) * 0.7) * Math.PI * sign;
  return currentAngle + deviation;
}

export function pickTargetBaseSpeed(phase: number): number {
  'worklet';
  const t = Math.pow(Math.abs(Math.sin(phase * 2.13)) * 0.5 + 0.25 * Math.abs(Math.sin(phase * 5.7 + 1.1)), 1 / ROAMER_BUTTERFLY_SPEED_PICK_BIAS);
  return ROAMER_BUTTERFLY_BASE_SPEED_MIN + t * (ROAMER_BUTTERFLY_BASE_SPEED_MAX - ROAMER_BUTTERFLY_BASE_SPEED_MIN);
}

export function cruiseDurationForPhase(phase: number): number {
  'worklet';
  const t = clamp(
    (Math.abs(Math.sin(phase * 1.7)) * 0.5 + 0.5 * Math.abs(Math.sin(phase * 4.1 + 0.5))),
    0,
    1,
  );
  const base = ROAMER_BUTTERFLY_CRUISE_DURATION_MAX - t * (ROAMER_BUTTERFLY_CRUISE_DURATION_MAX - ROAMER_BUTTERFLY_CRUISE_DURATION_MIN);
  return base + (Math.sin(phase * 9.7) * 0.5 * ROAMER_BUTTERFLY_CRUISE_DURATION_JITTER);
}

export function idleDurationForPhase(phase: number): number {
  'worklet';
  return ROAMER_BUTTERFLY_IDLE_DURATION_BASE + (Math.sin(phase * 7.3) * 0.5 * ROAMER_BUTTERFLY_IDLE_DURATION_JITTER);
}
