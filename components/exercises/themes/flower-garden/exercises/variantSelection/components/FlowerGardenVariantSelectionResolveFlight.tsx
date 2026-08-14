import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { ThemeResolveFlightProps } from '../../../../../themeContract';
import {
  ROUND_RESOLVE_FLY_DURATION_MS,
  ROUND_ROW_EXIT_DURATION_MS,
  ROUND_TRANSLATION_DISPLAY_MS,
} from '../../../../../variantSelection/domain/roundResolutionTiming';
import { hashSeedString } from '../../../scenery/BushShaderLayer/helpers/seededRandom';
import { TAP_MAX_DISTANCE_PX } from '../../../carrier/FlowerGardenWordSpriteTableLayer/config/flowerTableLayerConfig';
import { FlowerGardenBigWordOrb } from '../../sentenceTransformation/components/FlowerGardenBigWordOrb';

export type FlowerGardenVariantSelectionResolveFlightProps = ThemeResolveFlightProps;

export function FlowerGardenVariantSelectionResolveFlight({
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
}: FlowerGardenVariantSelectionResolveFlightProps) {
  const resolveX = useSharedValue(fromCenterX);
  const resolveY = useSharedValue(fromCenterY);
  const targetDiameter = useSharedValue(diameter);
  const overallOpacity = useSharedValue(1);

  const [showTranslation, setShowTranslation] = useState(false);
  const translatedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onResolveCompleteRef = useRef(onResolveComplete);
  onResolveCompleteRef.current = onResolveComplete;
  const onExitCompleteRef = useRef(onExitComplete);
  onExitCompleteRef.current = onExitComplete;

  const fireResolveComplete = useCallback(() => {
    onResolveCompleteRef.current?.();
  }, []);

  const fireExitComplete = useCallback(() => {
    onExitCompleteRef.current?.();
  }, []);

  useEffect(() => {
    if (phase === 'idle') {
      resolveX.value = fromCenterX;
      resolveY.value = fromCenterY;
      return;
    }

    if (phase === 'resolve') {
      resolveX.value = fromCenterX;
      resolveY.value = fromCenterY;
      resolveX.value = withTiming(
        toCenterX,
        {
          duration: ROUND_RESOLVE_FLY_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        },
        finished => {
          'worklet';
          if (finished) {
            scheduleOnRN(fireResolveComplete);
          }
        },
      );
      resolveY.value = withTiming(toCenterY, {
        duration: ROUND_RESOLVE_FLY_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
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
            scheduleOnRN(fireExitComplete);
          }
        },
      );
      resolveY.value = withTiming(toSpawnY, {
        duration: ROUND_ROW_EXIT_DURATION_MS,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [
    phase,
    fromCenterX,
    fromCenterY,
    toCenterX,
    toCenterY,
    toSpawnX,
    toSpawnY,
    resolveX,
    resolveY,
    fireResolveComplete,
    fireExitComplete,
  ]);

  useEffect(() => {
    if (phase !== 'hold') {
      return;
    }
    setShowTranslation(false);
  }, [phase]);

  const handleTap = useCallback(() => {
    if (!translation) {
      return;
    }
    setShowTranslation(true);
    if (translatedTimeoutRef.current != null) {
      clearTimeout(translatedTimeoutRef.current);
    }
    translatedTimeoutRef.current = setTimeout(() => {
      setShowTranslation(false);
      translatedTimeoutRef.current = null;
    }, ROUND_TRANSLATION_DISPLAY_MS);
  }, [translation]);

  const tapGesture = useTapGesture({
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(handleTap);
    },
  });

  const displayWord = showTranslation && translation ? translation : form;
  const seed = useMemo(
    () => hashSeedString(`flower-garden-variant-resolve-${form}`),
    [form],
  );

  const isHolding = phase === 'hold';

  if (phase === 'idle') {
    return null;
  }

  return (
    <>
      <FlowerGardenBigWordOrb
        centerX={resolveX}
        centerY={resolveY}
        targetDiameter={targetDiameter}
        overallOpacity={overallOpacity}
        word={displayWord}
        seed={seed}
      />
      {isHolding && translation && (
        <GestureDetector gesture={tapGesture}>
          <View
            style={[
              styles.gestureCapture,
              {
                left: toCenterX - diameter * 0.7,
                top: toCenterY - diameter * 0.7,
                width: diameter * 1.4,
                height: diameter * 1.4,
              },
            ]}
          />
        </GestureDetector>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  gestureCapture: {
    position: 'absolute',
  },
});
