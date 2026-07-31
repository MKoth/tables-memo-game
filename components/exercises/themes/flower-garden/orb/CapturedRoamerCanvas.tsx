import React, { useMemo } from 'react';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { SkImage } from '@shopify/react-native-skia';
import { ButterflyInstance } from '../roamer/butterfly/ButterflyInstance';
import { BeeInstance } from '../roamer/bee/BeeInstance';
import { BumblebeeInstance } from '../roamer/bumblebee/BumblebeeInstance';
import { ORB_CAPTIVE_DRIFT_RATIO, ORB_ROAMER_SCALE } from './orbAnimPresets';
import type { OrbAnimState } from './orbAnimTypes';
import type { RoamerRuntimeEntry, RoamerSpawn } from '../roamer/core/types';

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

function clamp01(t: number): number {
  'worklet';
  return Math.min(1, Math.max(0, t));
}

export type CapturedRoamerCanvasProps = {
  entry: RoamerRuntimeEntry;
  anim: SharedValue<OrbAnimState>;
  bodyImage: SkImage;
  leftWingImage: SkImage;
  rightWingImage: SkImage;
  centerX: number;
  centerY: number;
};

type InstanceProps = React.ComponentType<{
  x: ReturnType<typeof useSharedValue<number>>;
  y: ReturnType<typeof useSharedValue<number>>;
  angle: ReturnType<typeof useSharedValue<number>>;
  wingPhase: ReturnType<typeof useSharedValue<number>>;
  bodyScale: ReturnType<typeof useSharedValue<number>>;
  renderMode: number;
  bodyImage: SkImage;
  leftWingImage: SkImage;
  rightWingImage: SkImage;
  legPhases: ReturnType<typeof useSharedValue<number>>[];
  legVisibility: ReturnType<typeof useSharedValue<number>>;
  isPreTakeoff: ReturnType<typeof useSharedValue<number>>;
  spawnLegPhaseOffsets: number[];
}>;

function pickInstance(spawn: RoamerSpawn): InstanceProps {
  if (spawn.species === 'butterfly') {
    return ButterflyInstance as unknown as InstanceProps;
  }
  if (spawn.species === 'bee') {
    return BeeInstance as unknown as InstanceProps;
  }
  return BumblebeeInstance as unknown as InstanceProps;
}

function clampToOrb(
  rawX: number,
  rawY: number,
  centerX: number,
  centerY: number,
  maxRadius: number,
): { x: number; y: number } {
  'worklet';
  const dx = rawX - centerX;
  const dy = rawY - centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= maxRadius || dist === 0) {
    return { x: rawX, y: rawY };
  }
  const scale = maxRadius / dist;
  return { x: centerX + dx * scale, y: centerY + dy * scale };
}

export function CapturedRoamerCanvas({
  entry,
  anim,
  bodyImage,
  leftWingImage,
  rightWingImage,
  centerX,
  centerY,
}: CapturedRoamerCanvasProps) {
  const Instance = useMemo(() => pickInstance(entry.spawn), [entry.spawn]);

  const visualX = useDerivedValue(() => {
    const maxRadius = anim.value.diameter * 0.5 * (1 - ORB_CAPTIVE_DRIFT_RATIO);
    const clamped = clampToOrb(
      entry.runtime.x.value,
      entry.runtime.y.value,
      centerX,
      centerY,
      maxRadius,
    );
    return clamped.x;
  });

  const visualY = useDerivedValue(() => {
    const maxRadius = anim.value.diameter * 0.5 * (1 - ORB_CAPTIVE_DRIFT_RATIO);
    const clamped = clampToOrb(
      entry.runtime.x.value,
      entry.runtime.y.value,
      centerX,
      centerY,
      maxRadius,
    );
    return clamped.y;
  });

  const visualBodyScale = useDerivedValue(() => {
    return lerp(1.0, ORB_ROAMER_SCALE, clamp01(anim.value.captureVisualT));
  });

  return (
    <Instance
      x={visualX}
      y={visualY}
      angle={entry.runtime.angle}
      wingPhase={entry.runtime.wingPhase}
      bodyScale={visualBodyScale}
      renderMode={0}
      bodyImage={bodyImage}
      leftWingImage={leftWingImage}
      rightWingImage={rightWingImage}
      legPhases={entry.runtime.legPhases}
      legVisibility={entry.runtime.legVisibility}
      isPreTakeoff={entry.runtime.isPreTakeoff}
      spawnLegPhaseOffsets={entry.spawn.legPhaseOffsets}
    />
  );
}
