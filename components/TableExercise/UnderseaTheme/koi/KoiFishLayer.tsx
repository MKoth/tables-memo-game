import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
import { useKoiTapGesture } from './gestures/useKoiTapGesture';
import { KoiInstance, KoiShadowInstance } from './fish/KoiInstance';
import type { KoiFishSimulation } from './simulation/useKoiFishSimulation';
import {
  KOI_SHADOW_COLOR,
  KOI_SHADOW_OFFSET_X,
  KOI_SHADOW_OFFSET_Y,
  KOI_SHADOW_OPACITY,
  KOI_SHADOW_SOFTNESS,
  type KoiImageKey,
} from './config/koiFishLayerConfig';

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
