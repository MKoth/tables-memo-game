import {
  ORB_BURST_CONE_RAD,
  ORB_BURST_DISTANCE,
  ORB_PETAL_FADE_END,
  ORB_PETAL_FADE_START,
  ORB_RING_CONFIGS,
  ORB_SPAWN_DIAMETER_RATIO,
  ORB_WRONG_SHAKE_HZ,
  ORB_WRONG_TINT_STRENGTH,
} from './orbAnimPresets';
import {
  OrbPhase,
  type OrbAnimState,
  type OrbAnimationConfig,
  type PetalAnimState,
  type PetalRingConfig,
  type PetalSpawnConfig,
} from './orbAnimTypes';

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

function clamp01(t: number): number {
  'worklet';
  return Math.min(1, Math.max(0, t));
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

function idlePetal(
  ring: PetalRingConfig,
  spawn: PetalSpawnConfig,
  idleElapsedMs: number,
  ringRadiusScale: number,
): { x: number; y: number; scaleX: number } {
  'worklet';
  const tSec = idleElapsedMs / 1000;
  const ringAngleOffset = ring.phaseOffset + ring.rotationSpeed * ring.direction * tSec;
  const angle = spawn.initialAngle + ringAngleOffset;
  const radius = spawn.startRadius * ringRadiusScale;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    scaleX: 1,
  };
}

function enterPetal(
  ring: PetalRingConfig,
  spawn: PetalSpawnConfig,
  enterProgress: number,
  targetCenterX: number,
  targetCenterY: number,
  originX: number,
  originY: number,
  ringRadiusScale: number,
  targetDiameter: number,
  startScale: number,
): { x: number; y: number; scaleX: number } {
  'worklet';
  const t = clamp01(enterProgress);
  const endAngle = spawn.initialAngle + ring.phaseOffset;
  const endRadius = spawn.startRadius * ringRadiusScale;
  const endX = targetCenterX + Math.cos(endAngle) * endRadius;
  const endY = targetCenterY + Math.sin(endAngle) * endRadius;
  const startRadiusPx = targetDiameter * 0.5 * 0.05;
  const startX = originX + Math.cos(spawn.startAngle) * startRadiusPx;
  const startY = originY + Math.sin(spawn.startAngle) * startRadiusPx;
  const lerpX = lerp(startX, endX, t);
  const lerpY = lerp(startY, endY, t);
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.hypot(dx, dy);
  const perpX = len > 0 ? -dy / len : 0;
  const perpY = len > 0 ? dx / len : 0;
  const spiralAmplitude = len * 0.18;
  const spiralOffset = Math.sin(t * Math.PI) * spiralAmplitude;
  const fadeInT = clamp01(t / 0.12);
  return {
    x: lerpX + perpX * spiralOffset,
    y: lerpY + perpY * spiralOffset,
    scaleX: fadeInT * lerp(startScale, 1, t),
  };
}

function burstPetal(
  ring: PetalRingConfig,
  spawn: PetalSpawnConfig,
  burstProgress: number,
  idleElapsedMs: number,
  targetCenterX: number,
  targetCenterY: number,
  ringRadiusScale: number,
  targetDiameter: number,
): { x: number; y: number; opacity: number; scaleX: number } {
  'worklet';
  const idle = idlePetal(ring, spawn, idleElapsedMs, ringRadiusScale);
  const idleX = targetCenterX + idle.x;
  const idleY = targetCenterY + idle.y;
  const idleAngle = Math.atan2(idleY - targetCenterY, idleX - targetCenterX);
  const scatterAngle = idleAngle + spawn.burstAngle * ORB_BURST_CONE_RAD;
  const scatterDistance = targetDiameter * 0.5 * ORB_BURST_DISTANCE * spawn.burstSpeed;
  const t = clamp01(burstProgress);
  const scatter = Math.pow(t, 0.7) * scatterDistance;
  const fadeT = t < ORB_PETAL_FADE_START
    ? 0
    : clamp01((t - ORB_PETAL_FADE_START) / (ORB_PETAL_FADE_END - ORB_PETAL_FADE_START));
  return {
    x: idleX + Math.cos(scatterAngle) * scatter,
    y: idleY + Math.sin(scatterAngle) * scatter,
    opacity: 1 - fadeT,
    scaleX: idle.scaleX,
  };
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

export function computeOrbAnimState(
  phase: number,
  enterProgress: number,
  burstProgress: number,
  idleElapsedMs: number,
  config: OrbAnimationConfig,
  rings: ReadonlyArray<PetalRingConfig>,
  petals: ReadonlyArray<PetalSpawnConfig>,
  wrong: OrbWrongStateInput = NO_WRONG,
): OrbAnimState {
  'worklet';
  const { originX, originY } = config;
  const targetCenterX = config.moveCenterX?.value ?? config.targetCenterX;
  const targetCenterY = config.moveCenterY?.value ?? config.targetCenterY;
  const targetDiameter = config.moveDiameter?.value ?? config.targetDiameter;
  const ringRadiusScale = targetDiameter;
  const startDiameter =
    config.initialDiameter != null && config.initialDiameter > 0
      ? config.initialDiameter
      : targetDiameter * ORB_SPAWN_DIAMETER_RATIO;
  const startScale = startDiameter / targetDiameter;

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

  if (phase === OrbPhase.None) {
    const zeroPetals: PetalAnimState[] = petals.map(p => ({
      x: originX + shakeX,
      y: originY + shakeY,
      angle: p.initialAngle,
      scaleX: 0,
      opacity: 0,
      tintStrength,
    }));
    return {
      centerX,
      centerY,
      diameter: 0,
      overallOpacity: 0,
      petals: zeroPetals,
      captureVisualT: 0,
      ...tinted,
    };
  }

  if (phase === OrbPhase.Burst) {
    const outPetals: PetalAnimState[] = [];
    let minOpacity = 1;
    for (let i = 0; i < petals.length; i++) {
      const ring = rings[petals[i]!.ringIndex]!;
      const burst = burstPetal(
        ring,
        petals[i]!,
        burstProgress,
        idleElapsedMs,
        centerX,
        centerY,
        ringRadiusScale,
        targetDiameter,
      );
      if (burst.opacity < minOpacity) {
        minOpacity = burst.opacity;
      }
      outPetals.push({
        x: burst.x,
        y: burst.y,
        angle: petals[i]!.initialAngle,
        scaleX: burst.scaleX,
        opacity: burst.opacity,
        tintStrength,
      });
    }
    return {
      centerX,
      centerY,
      diameter: targetDiameter,
      overallOpacity: minOpacity,
      petals: outPetals,
      captureVisualT: 1 - clamp01(burstProgress / 0.4),
      ...tinted,
    };
  }

  if (phase === OrbPhase.Idle) {
    const outPetals: PetalAnimState[] = [];
    for (let i = 0; i < petals.length; i++) {
      const ring = rings[petals[i]!.ringIndex]!;
      const idle = idlePetal(ring, petals[i]!, idleElapsedMs, ringRadiusScale);
      outPetals.push({
        x: centerX + idle.x,
        y: centerY + idle.y,
        angle: petals[i]!.initialAngle,
        scaleX: idle.scaleX,
        opacity: 1,
        tintStrength,
      });
    }
    return {
      centerX,
      centerY,
      diameter: targetDiameter,
      overallOpacity: 1,
      petals: outPetals,
      captureVisualT: 1,
      ...tinted,
    };
  }

  const t = clamp01(enterProgress);
  const diameter = lerp(startDiameter, targetDiameter, t);
  const outPetals: PetalAnimState[] = [];
  for (let i = 0; i < petals.length; i++) {
    const ring = rings[petals[i]!.ringIndex]!;
    const enter = enterPetal(
      ring,
      petals[i]!,
      t,
      centerX,
      centerY,
      originX,
      originY,
      ringRadiusScale,
      targetDiameter,
      startScale,
    );
    outPetals.push({
      x: enter.x,
      y: enter.y,
      angle: petals[i]!.initialAngle,
      scaleX: enter.scaleX,
      opacity: t,
      tintStrength,
    });
  }
  return {
    centerX,
    centerY,
    diameter,
    overallOpacity: t,
    petals: outPetals,
    captureVisualT: 1,
    ...tinted,
  };
}

export { ORB_RING_CONFIGS };
