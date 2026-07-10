import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeLayout } from '../../core/providers/UnderseaThemeLayoutProvider';
import { useUnderseaThemeClockQuantized } from '../../core/clock/UnderseaThemeClockProvider';
import { CellJellyfish } from '../../jellyfish/JellyfishTableLayer/components/CellJellyfish';
import { CellLabel } from '../../jellyfish/JellyfishTableLayer/components/CellLabel';
import type { CellConfig } from '../../jellyfish/JellyfishTableLayer/helpers/cellConfigBuilders';
import {
  BODY_FONT_SIZE,
  DEFAULT_TRANSLATION_DISPLAY_MS,
  JELLYFISH_CLOCK_FPS,
  TAP_MAX_DISTANCE_PX,
} from '../../jellyfish/JellyfishTableLayer/config/jellyfishTableLayerConfig';
import {
  ROUND_RESOLVE_FLY_DURATION_MS,
  ROUND_ROW_EXIT_DURATION_MS,
} from '../domain/roundResolutionTiming';

export type VariantSelectionResolveFlightPhase = 'idle' | 'resolve' | 'hold' | 'exit';

export type VariantSelectionResolveFlightProps = {
  phase: VariantSelectionResolveFlightPhase;
  form: string;
  translation?: string;
  fromCenterX: number;
  fromCenterY: number;
  toCenterX: number;
  toCenterY: number;
  diameter: number;
  toSpawnX: number;
  toSpawnY: number;
  onResolveComplete?: () => void;
  onExitComplete?: () => void;
};

function toResolveCellConfig(form: string, bellSize: number): CellConfig {
  return {
    key: 'resolve-flight',
    index: 0,
    gridCol: 0,
    gridRow: 0,
    isHeader: false,
    label: form,
    bellSize,
    phase: 0,
    pulseSpeed: 2.2,
    labelFillColor: 'rgba(255,255,255,0.95)',
    labelStrokeColor: 'rgba(20,40,60,0.92)',
    translation: '',
    tintMode: 2 as const,
    tintStrength: 0.9,
    tintA: [0.6, 1.3, 1.8] as const,
    tintB: [0.5, 1.15, 1.6] as const,
    tintC: [0.4, 0.95, 1.35] as const,
    animatedTint: true,
    tintWaveSpeed: 0.35,
  };
}

function computeJellyfishFontScale(bellSize: number): number {
  return Math.max(0.6, Math.min(1.2, bellSize / 60));
}

export function VariantSelectionResolveFlight({
  phase,
  form,
  translation,
  fromCenterX,
  fromCenterY,
  toCenterX,
  toCenterY,
  diameter,
  toSpawnX,
  toSpawnY,
  onResolveComplete,
  onExitComplete,
}: VariantSelectionResolveFlightProps) {
  const { images } = useUnderseaThemeAssetsContext();
  const { labelRotationRad } = useUnderseaThemeLayout();
  const clock = useUnderseaThemeClockQuantized(JELLYFISH_CLOCK_FPS);

  const resolveX = useSharedValue(fromCenterX);
  const resolveY = useSharedValue(fromCenterY);
  const layoutX = useDerivedValue(() => [resolveX.value]);
  const layoutY = useDerivedValue(() => [resolveY.value]);
  const layoutScale = useDerivedValue(() => [1]);
  const motionAngle = useSharedValue(0);
  const motionAmp = useSharedValue(0);
  const tintFlashPreset = useSharedValue<number[]>([-1]);
  const tintFlashUntil = useSharedValue<number[]>([0]);
  const retainedLabelRotation = useSharedValue(0);

  const [showTranslation, setShowTranslation] = useState(false);
  const translatedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onResolveCompleteRef = useRef(onResolveComplete);
  onResolveCompleteRef.current = onResolveComplete;
  const onExitCompleteRef = useRef(onExitComplete);
  onExitCompleteRef.current = onExitComplete;

  const [isVisible, setIsVisible] = useState(false);
  const isVisibleRef = useRef(isVisible);
  isVisibleRef.current = isVisible;

  useEffect(() => {
    if (phase === 'idle') {
      setIsVisible(false);
      resolveX.value = fromCenterX;
      resolveY.value = fromCenterY;
      return;
    }

    setIsVisible(true);

    if (phase === 'resolve') {
      resolveX.value = withTiming(
        toCenterX,
        {
          duration: ROUND_RESOLVE_FLY_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        },
        finished => {
          'worklet';
          if (finished) {
            if (isVisibleRef.current) {
              scheduleOnRN(() => onResolveCompleteRef.current?.());
            }
          }
        },
      );
      resolveY.value = withTiming(
        toCenterY,
        {
          duration: ROUND_RESOLVE_FLY_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        },
      );
    } else if (phase === 'exit') {
      resolveX.value = withTiming(
        toSpawnX,
        {
          duration: ROUND_ROW_EXIT_DURATION_MS,
          easing: Easing.in(Easing.cubic),
        },
        finished => {
          'worklet';
          if (finished) {
            if (isVisibleRef.current) {
              scheduleOnRN(() => onExitCompleteRef.current?.());
            }
          }
        },
      );
      resolveY.value = withTiming(
        toSpawnY,
        {
          duration: ROUND_ROW_EXIT_DURATION_MS,
          easing: Easing.in(Easing.cubic),
        },
      );
    }
  }, [phase, fromCenterX, fromCenterY, toCenterX, toCenterY, toSpawnX, toSpawnY, resolveX, resolveY]);

  const handleTap = useCallback(() => {
    if (!translation) return;
    setShowTranslation(true);
    if (translatedTimeoutRef.current != null) {
      clearTimeout(translatedTimeoutRef.current);
    }
    translatedTimeoutRef.current = setTimeout(() => {
      setShowTranslation(false);
      translatedTimeoutRef.current = null;
    }, DEFAULT_TRANSLATION_DISPLAY_MS);
  }, [translation]);

  const tapGesture = useTapGesture({
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(handleTap);
    },
  });

  const cellConfig = useMemo(() => toResolveCellConfig(form, diameter), [form, diameter]);

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const bodyFont = useMemo(() => {
    const scale = computeJellyfishFontScale(diameter);
    return matchFont({
      fontFamily,
      fontSize: BODY_FONT_SIZE * scale,
      fontWeight: '500',
    } as const);
  }, [fontFamily, diameter]);

  const isHolding = phase === 'hold';

  const displayLabel = showTranslation && translation ? translation : undefined;

  if (!isVisible) return null;

  return (
    <>
      <Canvas style={styles.canvas} pointerEvents="none">
        <CellJellyfish
          config={cellConfig}
          layoutX={layoutX}
          layoutY={layoutY}
          layoutScale={layoutScale}
          motionAngle={motionAngle}
          motionAmp={motionAmp}
          tintFlashPreset={tintFlashPreset}
          tintFlashUntil={tintFlashUntil}
          bellImage={images.jellyfishBell}
          tentacleImage={images.jellyfishTentacles}
          clock={clock}
        />
        <CellLabel
          config={cellConfig}
          font={bodyFont}
          layoutX={layoutX}
          layoutY={layoutY}
          layoutScale={layoutScale}
          motionAngle={motionAngle}
          motionAmp={motionAmp}
          retainedLabelRotation={retainedLabelRotation}
          tintFlashPreset={tintFlashPreset}
          tintFlashUntil={tintFlashUntil}
          clock={clock}
          labelBaseRotation={labelRotationRad}
          displayLabel={displayLabel}
        />
      </Canvas>
      {isHolding && translation && (
        <GestureDetector gesture={tapGesture}>
          <View
            style={[
              styles.gestureCapture,
              {
                left: toCenterX - diameter * 0.55,
                top: toCenterY - diameter * 0.55,
                width: diameter * 1.1,
                height: diameter * 1.1,
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
    top: 0,
    right: 0,
    bottom: 0,
  },
  gestureCapture: {
    position: 'absolute',
  },
});
