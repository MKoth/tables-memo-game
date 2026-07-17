import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useUnderseaThemeAssetsContext } from '../../../core/providers/UnderseaThemeAssetsProvider';
import { useExerciseClock } from '../../../../../core';
import { LetterBubble } from '../../wordTransformation/components/LetterBubble';
import { TAP_MAX_DISTANCE_PX } from '../../../carrier/WordSpriteTableLayer/config/wordSpriteTableLayerConfig';

import {
  ROUND_MATERIALIZE_DURATION_MS,
  type SentenceRoundPhase,
} from '../../../../../sentenceTransformation/domain';

const TRANSLATION_WOBBLE_MS = 800;

import type { RoundResolutionOrbState } from '../../../../../sentenceTransformation/domain/roundResolutionOrbState';
export type { RoundResolutionOrbState } from '../../../../../sentenceTransformation/domain/roundResolutionOrbState';

export type TransformationRoundResolutionBubbleProps = {
  orb: RoundResolutionOrbState | null;
  roundPhase: SentenceRoundPhase;
  translation?: string;
  onMaterializeComplete?: () => void;
  onResolveComplete?: () => void;
  onPopComplete?: () => void;
};

export function TransformationRoundResolutionBubble({
  orb,
  roundPhase,
  translation,
  onMaterializeComplete,
  onResolveComplete,
  onPopComplete,
}: TransformationRoundResolutionBubbleProps) {
  const { images, sounds } = useUnderseaThemeAssetsContext();
  const clock = useExerciseClock();

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const fontSize = useMemo(() => {
    if (orb == null) return 16;
    return Math.max(
      14,
      (orb.toDiameter * 0.5) / Math.max(1, orb.word.length * 0.52),
    );
  }, [orb]);
  const font = useMemo(
    () => matchFont({ fontFamily, fontSize, fontWeight: '700' }),
    [fontFamily, fontSize],
  );

  const wobbleBoostT = useSharedValue(0);

  const [showTranslation, setShowTranslation] = useState(false);
  const translateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBubbleTapJs = useCallback(() => {
    if (!translation) return;
    setShowTranslation(true);
    if (translateTimeoutRef.current != null) {
      clearTimeout(translateTimeoutRef.current);
    }
    translateTimeoutRef.current = setTimeout(() => {
      setShowTranslation(false);
      translateTimeoutRef.current = null;
    }, TRANSLATION_WOBBLE_MS);
  }, [translation]);

  useEffect(() => {
    if (orb != null && roundPhase === 'materialize') {
      sounds.playOrbInflate();
    }
  }, [orb, roundPhase, sounds]);

  const tapGesture = useTapGesture({
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: () => {
      'worklet';
      wobbleBoostT.value = 0;
      wobbleBoostT.value = withTiming(
        1,
        { duration: 100, easing: Easing.out(Easing.cubic) },
        () => {
          'worklet';
          wobbleBoostT.value = withTiming(0, {
            duration: TRANSLATION_WOBBLE_MS - 100,
            easing: Easing.in(Easing.cubic),
          });
        },
      );
      scheduleOnRN(handleBubbleTapJs);
    },
  });

  if (orb == null) {
    return null;
  }

  const isMaterializing = roundPhase === 'materialize';
  const isResolving = roundPhase === 'resolve';
  const isHolding = roundPhase === 'hold';
  const isPopping = roundPhase === 'pop';

  const visible = isMaterializing || isResolving || isHolding || isPopping;

  if (!visible) {
    return null;
  }

  const orbCenterX = isMaterializing ? orb.fromCenterX : orb.toCenterX;
  const orbCenterY = isMaterializing ? orb.fromCenterY : orb.toCenterY;
  const orbDiameter = isMaterializing ? orb.fromDiameter : orb.toDiameter;
  const moveDuration = isMaterializing
    ? ROUND_MATERIALIZE_DURATION_MS
    : isResolving
      ? orb.flyDurationMs
      : 0;
  const moveComplete = isMaterializing
    ? onMaterializeComplete
    : isResolving
      ? onResolveComplete
      : undefined;

  const orbChar = showTranslation && translation ? translation : orb.word;

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <LetterBubble
          key={orb.word}
          char={orbChar}
          centerX={orbCenterX}
          centerY={orbCenterY}
          diameter={orbDiameter}
          initialCenterX={orb.fromCenterX}
          initialCenterY={orb.fromCenterY}
          initialDiameter={
            isMaterializing ? orb.fromDiameter * 0.85 : orb.fromDiameter
          }
          skipEnter
          labelFixed
          moveDurationMs={moveDuration}
          status={isPopping ? 'popped' : 'idle'}
          image={images.bubble}
          font={font}
          clock={clock}
          letterSpacing={Math.max(1, fontSize * 0.08)}
          onEnterSound={sounds.playOrbInflate}
          onMoveComplete={moveComplete}
          onPopComplete={onPopComplete}
          wobbleBoostT={isHolding ? wobbleBoostT : undefined}
        />
      </Canvas>
      {isHolding && translation && (
        <GestureDetector gesture={tapGesture}>
          <View
            style={{
              position: 'absolute',
              left: orb.toCenterX - orb.toDiameter * 0.55,
              top: orb.toCenterY - orb.toDiameter * 0.55,
              width: orb.toDiameter * 1.1,
              height: orb.toDiameter * 1.1,
            }}
          />
        </GestureDetector>
      )}
    </>
  );
}
