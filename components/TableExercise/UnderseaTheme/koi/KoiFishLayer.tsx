import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
import { useKoiTapGesture } from './gestures/useKoiTapGesture';
import { KoiInstance, KoiShadowInstance } from './KoiInstance';
import type { KoiFishSimulation } from './simulation/useKoiFishSimulation';

export const SWIM_ZONE_TOP_RATIO = 0.5;

/** Legacy default count — production uses `words.length`. */
export const KOI_COUNT = 20;

/** Shared settings applied to every fish. */
export const KOI_SETTINGS = {
  sourceAngle: Math.PI / 2,
  scale: 1.0,
  targetAmplitude: 0.14,
  tailBendScale: 5.5,
  tailTipBendScale: 7.5,
  headBendScale: 0.35,
  turnArcGain: 0.28,
  turnSquashGain: 0.2,
  turnBulgeGain: 0.2,
  finThinProbability: 0.5,
  finRetractFreqBase: 4.8,
  finThinFreqBase: 5.5,
  finRetractFreqJitter: 0.25,
  finThinFreqJitter: 0.25,
  finSquashBase: 0.1,
  finSquashAmp: 0.5,
  finBehaviorRerollInterval: 3.5,
  finBehaviorRerollJitter: 2.0,
} as const;

/** px — shadow offset from fish center (light from above-left). */
export const KOI_SHADOW_OFFSET_X = 30;
export const KOI_SHADOW_OFFSET_Y = 70;
export const KOI_SHADOW_COLOR = [0.02, 0.06, 0.12] as const;
export const KOI_SHADOW_OPACITY = 0.15;
export const KOI_SHADOW_SOFTNESS = 0.45;

export type FinSideSpawn = {
  variant: 0 | 1;
  freq: number;
  initialPhase: number;
};

export type KoiImageKey = 'koi1' | 'koi2' | 'koi3';

export const KOI_OVERLAY_PROBABILITY = 0.4;
export const KOI_BODY_TINT_PROBABILITY = 0.3;

export const KOI_SPOT_PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [0.92, 0.18, 0.12],
  [0.98, 0.42, 0.08],
  [1.00, 0.75, 0.12],
  [0.10, 0.10, 0.12],
  [0.05, 0.05, 0.05],
  [0.42, 0.25, 0.10],
  [0.73, 0.58, 0.25],
  [0.60, 0.12, 0.10],
  [0.95, 0.65, 0.25],
  [0.12, 0.12, 0.14],
  [0.45, 0.28, 0.12],
  [0.95, 0.55, 0.18],
  [0.65, 0.15, 0.12],
  [0.95, 0.55, 0.55],
  [0.88, 0.45, 0.42],
  [0.05, 0.20, 0.05],
  [0.35, 0.45, 0.20],
  [0.60, 0.72, 0.25],
];

export const KOI_BODY_PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [0.92, 0.18, 0.12],
  [0.10, 0.10, 0.12],
  [0.42, 0.25, 0.10],
  [0.60, 0.12, 0.10],
  [0.12, 0.12, 0.14],
  [0.05, 0.05, 0.05],
  [0.45, 0.28, 0.12],
  [0.65, 0.15, 0.12],
  [0.35, 0.45, 0.20],
];

export type KoiSharedSettings = typeof KOI_SETTINGS;

export function findKoiIndexAtTap(
  tapX: number,
  tapY: number,
  positions: number[],
  count: number,
  hitRadius: number,
  eliminated: number[],
): number {
  'worklet';
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < count; i++) {
    let isEliminated = false;
    for (let e = 0; e < eliminated.length; e++) {
      if (eliminated[e] === i) {
        isEliminated = true;
        break;
      }
    }
    if (isEliminated) {
      continue;
    }
    const cx = positions[i * 2] ?? 0;
    const cy = positions[i * 2 + 1] ?? 0;
    const dist = Math.hypot(tapX - cx, tapY - cy);
    if (dist <= hitRadius && dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export type KoiFishLayerProps = {
  sim: KoiFishSimulation;
  images: Record<KoiImageKey, SkImage>;
  masks: Record<KoiImageKey, SkImage>;
  capturedFishIndex?: number | null;
  eliminatedFishSv?: SharedValue<number[]>;
  eliminatedFishIndices?: number[];
  interactive?: boolean;
  onFishSelect?: (word: string, fishIndex: number, originX: number, originY: number) => void;
};

export function KoiFishLayer({
  sim,
  images,
  masks,
  capturedFishIndex = null,
  eliminatedFishSv,
  eliminatedFishIndices = [],
  interactive = true,
  onFishSelect,
}: KoiFishLayerProps) {
  const {
    runtimeEntries,
    sharedPositions,
    renderProps,
    hitRadius,
    swimZoneTop,
    swimZoneHeight,
    swimZoneLeft,
    swimZoneWidth,
  } = sim;
  const koiCount = runtimeEntries.length;
  const emptyEliminatedSv = useSharedValue<number[]>([]);
  const eliminatedSv = eliminatedFishSv ?? emptyEliminatedSv;

  const handleFishSelect = useCallback(
    (fishIndex: number, originX: number, originY: number) => {
      const word = runtimeEntries[fishIndex]?.spawn.word;
      if (word != null) {
        onFishSelect?.(word, fishIndex, originX, originY);
      }
    },
    [runtimeEntries, onFishSelect],
  );

  const tapGesture = useKoiTapGesture({
    sharedPositions,
    koiCount,
    hitRadius,
    eliminatedSv,
    swimZoneLeft,
    swimZoneTop,
    onFishSelect: handleFishSelect,
  });

  const isHidden = useCallback(
    (index: number) =>
      index === capturedFishIndex || eliminatedFishIndices.includes(index),
    [capturedFishIndex, eliminatedFishIndices],
  );

  if (koiCount === 0) {
    return null;
  }

  return (
    <>
      <Canvas style={styles.canvas} pointerEvents="none">
        <Group>
          {runtimeEntries.map(({ spawn, runtime }, index) => {
            if (isHidden(index)) {
              return null;
            }
            return (
              <KoiShadowInstance
                key={`shadow-${index}`}
                image={images[spawn.imageKey]}
                maskImage={masks[spawn.imageKey]}
                overlayMaskImage={masks[spawn.overlayMaskKey]}
                spotColor={spawn.spotColor}
                bodyColor={spawn.bodyColor}
                bodyTintStrength={spawn.bodyTintStrength}
                overlayColor={spawn.overlayColor}
                overlayStrength={spawn.overlayStrength}
                {...renderProps}
                phase={spawn.phase}
                state={{
                  x: runtime.x,
                  y: runtime.y,
                  angle: runtime.angle,
                  amplitude: runtime.amplitude,
                  turnArc: runtime.turnArc,
                  wavePhase: runtime.wavePhase,
                  finSquashLeft: runtime.finSquashLeft,
                  finSquashRight: runtime.finSquashRight,
                  finVariantLeft: runtime.finVariantLeft,
                  finVariantRight: runtime.finVariantRight,
                }}
                offsetX={KOI_SHADOW_OFFSET_X}
                offsetY={KOI_SHADOW_OFFSET_Y}
                shadowColor={KOI_SHADOW_COLOR}
                shadowOpacity={KOI_SHADOW_OPACITY}
                shadowSoftness={KOI_SHADOW_SOFTNESS}
              />
            );
          })}
        </Group>
        <Group>
          {runtimeEntries.map(({ spawn, runtime }, index) => {
            if (isHidden(index)) {
              return null;
            }
            return (
              <KoiInstance
                key={`fish-${index}`}
                image={images[spawn.imageKey]}
                maskImage={masks[spawn.imageKey]}
                overlayMaskImage={masks[spawn.overlayMaskKey]}
                spotColor={spawn.spotColor}
                bodyColor={spawn.bodyColor}
                bodyTintStrength={spawn.bodyTintStrength}
                overlayColor={spawn.overlayColor}
                overlayStrength={spawn.overlayStrength}
                {...renderProps}
                phase={spawn.phase}
                state={{
                  x: runtime.x,
                  y: runtime.y,
                  angle: runtime.angle,
                  amplitude: runtime.amplitude,
                  turnArc: runtime.turnArc,
                  wavePhase: runtime.wavePhase,
                  finSquashLeft: runtime.finSquashLeft,
                  finSquashRight: runtime.finSquashRight,
                  finVariantLeft: runtime.finVariantLeft,
                  finVariantRight: runtime.finVariantRight,
                }}
              />
            );
          })}
        </Group>
      </Canvas>
      {interactive && onFishSelect != null && (
        <GestureDetector gesture={tapGesture}>
          <View
            style={[
              styles.gestureCapture,
              {
                left: swimZoneLeft,
                top: swimZoneTop,
                width: swimZoneWidth,
                height: swimZoneHeight,
              },
            ]}
          />
        </GestureDetector>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  gestureCapture: {
    position: 'absolute',
  },
});
