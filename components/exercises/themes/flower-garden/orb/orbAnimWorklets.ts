import {
  ORB_BURST_CONE_RAD,
  ORB_BURST_DISTANCE,
  ORB_PETAL_FADE_END,
  ORB_PETAL_FADE_START,
  ORB_RING_CONFIGS,
  ORB_SPAWN_DIAMETER_RATIO,
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
  const ringAngleOffset = ring.rotationSpeed * ring.direction * tSec;
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
): { x: number; y: number; scaleX: number } {
  'worklet';
  const t = clamp01(enterProgress);
  const endAngle = spawn.initialAngle;
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
  const baseDiameter = targetDiameter * ORB_SPAWN_DIAMETER_RATIO;
  const diameter = lerp(baseDiameter, targetDiameter, t);
  const diameterScale = diameter / targetDiameter;
  const fadeInT = clamp01(t / 0.12);
  return {
    x: lerpX + perpX * spiralOffset,
    y: lerpY + perpY * spiralOffset,
    scaleX: fadeInT * diameterScale,
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

export function computeOrbAnimState(
  phase: number,
  enterProgress: number,
  burstProgress: number,
  idleElapsedMs: number,
  config: OrbAnimationConfig,
  rings: ReadonlyArray<PetalRingConfig>,
  petals: ReadonlyArray<PetalSpawnConfig>,
): OrbAnimState {
  'worklet';
  const { originX, originY, targetCenterX, targetCenterY, targetDiameter } = config;
  const ringRadiusScale = targetDiameter;
  const startDiameter = targetDiameter * ORB_SPAWN_DIAMETER_RATIO;

  if (phase === OrbPhase.None) {
    const zeroPetals: PetalAnimState[] = petals.map(p => ({
      x: originX,
      y: originY,
      angle: p.initialAngle,
      scaleX: 0,
      opacity: 0,
    }));
    return {
      centerX: targetCenterX,
      centerY: targetCenterY,
      diameter: 0,
      overallOpacity: 0,
      petals: zeroPetals,
      captureVisualT: 0,
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
        targetCenterX,
        targetCenterY,
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
      });
    }
    return {
      centerX: targetCenterX,
      centerY: targetCenterY,
      diameter: targetDiameter,
      overallOpacity: minOpacity,
      petals: outPetals,
      captureVisualT: 1 - clamp01(burstProgress / 0.4),
    };
  }

  if (phase === OrbPhase.Idle) {
    const outPetals: PetalAnimState[] = [];
    for (let i = 0; i < petals.length; i++) {
      const ring = rings[petals[i]!.ringIndex]!;
      const idle = idlePetal(ring, petals[i]!, idleElapsedMs, ringRadiusScale);
      outPetals.push({
        x: targetCenterX + idle.x,
        y: targetCenterY + idle.y,
        angle: petals[i]!.initialAngle,
        scaleX: idle.scaleX,
        opacity: 1,
      });
    }
    return {
      centerX: targetCenterX,
      centerY: targetCenterY,
      diameter: targetDiameter,
      overallOpacity: 1,
      petals: outPetals,
      captureVisualT: 1,
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
      targetCenterX,
      targetCenterY,
      originX,
      originY,
      ringRadiusScale,
      targetDiameter,
    );
    outPetals.push({
      x: enter.x,
      y: enter.y,
      angle: petals[i]!.initialAngle,
      scaleX: enter.scaleX,
      opacity: t,
    });
  }
  return {
    centerX: targetCenterX,
    centerY: targetCenterY,
    diameter,
    overallOpacity: t,
    petals: outPetals,
    captureVisualT: 1,
  };
}

export { ORB_RING_CONFIGS };
