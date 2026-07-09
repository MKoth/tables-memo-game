import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeClock } from '../../core/clock/UnderseaThemeClockProvider';
import { LetterBubble } from '../../wordTransformation/components/LetterBubble';

import {
  ROUND_RESOLVE_FLY_DURATION_MS,
  ROUND_SOLVED_POP_DURATION_MS,
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

  const visible =
    isMaterializing || isResolving || isHolding || isPopping;

  if (!visible) {
    return null;
  }

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <LetterBubble
        key={bubble.word}
        char={bubble.word}
        centerX={isMaterializing ? bubble.fromCenterX : bubble.toCenterX}
        centerY={isMaterializing ? bubble.fromCenterY : bubble.toCenterY}
        diameter={isMaterializing ? bubble.fromDiameter : bubble.toDiameter}
        initialCenterX={bubble.fromCenterX}
        initialCenterY={bubble.fromCenterY}
        initialDiameter={bubble.fromDiameter}
        skipEnter={!isMaterializing}
        labelFixed
        moveDurationMs={isResolving ? bubble.flyDurationMs : 0}
        status={isPopping ? 'popped' : 'idle'}
        image={images.bubble}
        font={font}
        clock={clock}
        onEnterSound={sounds.playBubbleInflate}
        onEnterComplete={onMaterializeComplete}
        onMoveComplete={isResolving ? onResolveComplete : undefined}
        onPopComplete={onPopComplete}
      />
    </Canvas>
  );
}
