import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeClock } from '../../core/clock/UnderseaThemeClockProvider';
import { LetterBubble } from '../../wordTransformation/components/LetterBubble';
import { TAP_MAX_DISTANCE_PX } from '../../jellyfish/JellyfishTableLayer/config/jellyfishTableLayerConfig';

import {
  ROUND_MATERIALIZE_DURATION_MS,
  type SentenceRoundPhase,
} from '../domain';

const TRANSLATION_WOBBLE_MS = 800;

export type RoundResolutionBubbleState = {
  word: string;
  fromCenterX: number;
  fromCenterY: number;
  fromDiameter: number;
  toCenterX: number;
  toCenterY: number;
  toDiameter: number;
  flyDurationMs: number;
};

export type TransformationRoundResolutionBubbleProps = {
  bubble: RoundResolutionBubbleState | null;
  roundPhase: SentenceRoundPhase;
  translation?: string;
  onMaterializeComplete?: () => void;
  onResolveComplete?: () => void;
  onPopComplete?: () => void;
};

export function TransformationRoundResolutionBubble({
  bubble,
  roundPhase,
  translation,
  onMaterializeComplete,
  onResolveComplete,
  onPopComplete,
}: TransformationRoundResolutionBubbleProps) {
  const { images, sounds } = useUnderseaThemeAssetsContext();
  const clock = useUnderseaThemeClock();

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const fontSize = useMemo(() => {
    if (bubble == null) return 16;
    return Math.max(
      14,
      (bubble.toDiameter * 0.5) / Math.max(1, bubble.word.length * 0.52),
    );
  }, [bubble]);
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
    if (bubble != null && roundPhase === 'materialize') {
      sounds.playBubbleInflate();
    }
  }, [bubble, roundPhase, sounds]);

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

  if (bubble == null) {
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

  const bubbleCenterX = isMaterializing ? bubble.fromCenterX : bubble.toCenterX;
  const bubbleCenterY = isMaterializing ? bubble.fromCenterY : bubble.toCenterY;
  const bubbleDiameter = isMaterializing ? bubble.fromDiameter : bubble.toDiameter;
  const moveDuration = isMaterializing
    ? ROUND_MATERIALIZE_DURATION_MS
    : isResolving
      ? bubble.flyDurationMs
      : 0;
  const moveComplete = isMaterializing
    ? onMaterializeComplete
    : isResolving
      ? onResolveComplete
      : undefined;

  const bubbleChar = showTranslation && translation ? translation : bubble.word;

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <LetterBubble
          key={bubble.word}
          char={bubbleChar}
          centerX={bubbleCenterX}
          centerY={bubbleCenterY}
          diameter={bubbleDiameter}
          initialCenterX={bubble.fromCenterX}
          initialCenterY={bubble.fromCenterY}
          initialDiameter={
            isMaterializing ? bubble.fromDiameter * 0.85 : bubble.fromDiameter
          }
          skipEnter
          labelFixed
          moveDurationMs={moveDuration}
          status={isPopping ? 'popped' : 'idle'}
          image={images.bubble}
          font={font}
          clock={clock}
          letterSpacing={Math.max(1, fontSize * 0.08)}
          onEnterSound={sounds.playBubbleInflate}
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
              left: bubble.toCenterX - bubble.toDiameter * 0.55,
              top: bubble.toCenterY - bubble.toDiameter * 0.55,
              width: bubble.toDiameter * 1.1,
              height: bubble.toDiameter * 1.1,
            }}
          />
        </GestureDetector>
      )}
    </>
  );
}
