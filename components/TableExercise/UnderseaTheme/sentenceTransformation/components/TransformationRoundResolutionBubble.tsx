import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeClock } from '../../core/clock/UnderseaThemeClockProvider';
import { LetterBubble } from '../../wordTransformation/components/LetterBubble';

import {
  ROUND_MATERIALIZE_DURATION_MS,
  type SentenceRoundPhase,
} from '../domain';

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
  onMaterializeComplete?: () => void;
  onResolveComplete?: () => void;
  onPopComplete?: () => void;
};

export function TransformationRoundResolutionBubble({
  bubble,
  roundPhase,
  onMaterializeComplete,
  onResolveComplete,
  onPopComplete,
}: TransformationRoundResolutionBubbleProps) {
  const { images, sounds } = useUnderseaThemeAssetsContext();
  const clock = useUnderseaThemeClock();

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const font = useMemo(() => {
    if (bubble == null) {
      return matchFont({ fontFamily, fontSize: 16, fontWeight: '700' });
    }
    const fontSize = Math.max(
      14,
      (bubble.toDiameter * 0.5) / Math.max(1, bubble.word.length * 0.52),
    );
    return matchFont({
      fontFamily,
      fontSize,
      fontWeight: '700',
    });
  }, [bubble, fontFamily]);

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

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <LetterBubble
        key={bubble.word}
        char={bubble.word}
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
        onEnterSound={sounds.playBubbleInflate}
        onMoveComplete={moveComplete}
        onPopComplete={onPopComplete}
      />
    </Canvas>
  );
}
