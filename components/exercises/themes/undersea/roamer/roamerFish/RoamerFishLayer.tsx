import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
import { useRoamerTapGesture } from '../gestures/useRoamerTapGesture';
import { RoamerInstance, RoamerShadowInstance } from './RoamerInstance';
import type { RoamerFishSimulation } from '../simulation/useRoamerFishSimulation';
import type { RoamerImageKey } from '../config/roamerFishSettings';
import {
  ROAMER_SHADOW_COLOR,
  ROAMER_SHADOW_OFFSET_X,
  ROAMER_SHADOW_OFFSET_Y,
  ROAMER_SHADOW_OPACITY,
  ROAMER_SHADOW_SOFTNESS,
} from '../config/roamerShadowConfig';

export type RoamerFishLayerProps = {
  sim: RoamerFishSimulation;
  images: Record<RoamerImageKey, SkImage>;
  masks: Record<RoamerImageKey, SkImage>;
  capturedFishIndex?: number | null;
  eliminatedFishSv?: SharedValue<number[]>;
  eliminatedFishIndices?: number[];
  interactive?: boolean;
  onFishSelect?: (word: string, fishIndex: number, originX: number, originY: number) => void;
  escapeActive?: SharedValue<boolean>;
  capturedFishIndexSv?: SharedValue<number>;
};

export function RoamerFishLayer({
  sim,
  images,
  masks,
  capturedFishIndex = null,
  eliminatedFishSv,
  eliminatedFishIndices = [],
  interactive = true,
  onFishSelect,
  escapeActive,
  capturedFishIndexSv,
}: RoamerFishLayerProps) {
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
  const roamerCount = runtimeEntries.length;
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

  const tapGesture = useRoamerTapGesture({
    sharedPositions,
    roamerCount,
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

  if (roamerCount === 0) {
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
              <RoamerShadowInstance
                key={`shadow-${index}`}
                fishIndex={index}
                escapeActive={escapeActive}
                capturedFishIndexSv={capturedFishIndexSv}
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
                offsetX={ROAMER_SHADOW_OFFSET_X}
                offsetY={ROAMER_SHADOW_OFFSET_Y}
                shadowColor={ROAMER_SHADOW_COLOR}
                shadowOpacity={ROAMER_SHADOW_OPACITY}
                shadowSoftness={ROAMER_SHADOW_SOFTNESS}
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
              <RoamerInstance
                key={`fish-${index}`}
                fishIndex={index}
                escapeActive={escapeActive}
                capturedFishIndexSv={capturedFishIndexSv}
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
