import type { RoamerConfig } from './roamerConfig';

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

export function pickErraticWanderAngle(
  currentAngle: number,
  phase: number,
  wingPhaseDiff: number,
): number {
  'worklet';
  const baseDev = Math.sin(phase * 7.3) * 0.15 + Math.sin(phase * 13.7) * 0.1;
  const spikeTrigger = Math.abs(Math.sin(phase * 2.17));
  const spike = spikeTrigger > 0.88
    ? Math.sin(phase * 5.3) * 0.35
    : 0;
  const wingMod = Math.sin(wingPhaseDiff * 0.7 + phase * 3.1) * 0.2;
  const deviation = (baseDev + spike + wingMod) * Math.PI;
  return currentAngle + deviation;
}

export function cruiseDurationForPhase(phase: number, config: RoamerConfig): number {
  'worklet';
  const t = clamp(
    (Math.abs(Math.sin(phase * 1.7)) * 0.5 + 0.5 * Math.abs(Math.sin(phase * 4.1 + 0.5))),
    0,
    1,
  );
  const base = config.cruiseDurationMax - t * (config.cruiseDurationMax - config.cruiseDurationMin);
  return base + (Math.sin(phase * 9.7) * 0.5 * config.cruiseDurationJitter);
}

export function idleDurationForPhase(phase: number, config: RoamerConfig): number {
  'worklet';
  return config.idleDurationBase + (Math.sin(phase * 7.3) * 0.5 * config.idleDurationJitter);
}
