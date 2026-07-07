import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeClock } from '../../core/clock/UnderseaThemeClockProvider';
import { LetterBubble } from '../../wordTransformation/components/LetterBubble';

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
  onComplete?: () => void;
};

export function TransformationRoundResolutionBubble({
  bubble,
  onComplete,
}: TransformationRoundResolutionBubbleProps) {
  const { images } = useUnderseaThemeAssetsContext();
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

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <LetterBubble
        key={bubble.word}
        char={bubble.word}
        centerX={bubble.toCenterX}
        centerY={bubble.toCenterY}
        diameter={bubble.toDiameter}
        initialCenterX={bubble.fromCenterX}
        initialCenterY={bubble.fromCenterY}
        initialDiameter={bubble.fromDiameter}
        skipEnter
        moveDurationMs={bubble.flyDurationMs}
        status="idle"
        image={images.bubble}
        font={font}
        clock={clock}
        onMoveComplete={onComplete}
      />
    </Canvas>
  );
}
