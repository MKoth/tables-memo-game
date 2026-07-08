import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeClock } from '../../core/clock/UnderseaThemeClockProvider';
import { useUnderseaThemeLayout } from '../../core/providers/UnderseaThemeLayoutProvider';
import { computeLetterLayout } from '../../core/layout/underseaExerciseLayout';
import { LetterBubble } from '../../wordTransformation/components/LetterBubble';
import { ROUND_MERGE_DURATION_MS } from '../domain/roundResolutionTiming';

export type TransformationMergeBubblesProps = {
  word: string;
  durationMs?: number;
  onComplete?: () => void;
};

export function TransformationMergeBubbles({
  word,
  durationMs = ROUND_MERGE_DURATION_MS,
  onComplete,
}: TransformationMergeBubblesProps) {
  const { koiRect } = useUnderseaThemeLayout();
  const { images } = useUnderseaThemeAssetsContext();
  const clock = useUnderseaThemeClock();

  const layout = useMemo(
    () => computeLetterLayout(koiRect, word.length),
    [koiRect, word.length],
  );

  const mergeCenterX = useMemo(() => {
    if (layout.centers.length === 0) {
      return koiRect.x + koiRect.w * 0.5;
    }
    return (
      (layout.centers[0]! + layout.centers[layout.centers.length - 1]!) * 0.5
    );
  }, [koiRect.w, koiRect.x, layout.centers]);

  const mergeDiameter = Math.max(layout.diameter * 0.55, 28);

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const font = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: Math.max(16, mergeDiameter * 0.5),
        fontWeight: '700',
      }),
    [fontFamily, mergeDiameter],
  );

  if (word.length === 0) {
    return null;
  }

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {word.split('').map((char, position) => (
        <LetterBubble
          key={`merge-${position}`}
          char={char}
          centerX={mergeCenterX}
          centerY={layout.rowY}
          diameter={mergeDiameter}
          initialCenterX={layout.centers[position] ?? mergeCenterX}
          initialCenterY={layout.rowY}
          initialDiameter={layout.diameter}
          skipEnter
          moveDurationMs={durationMs}
          status="idle"
          image={images.bubble}
          font={font}
          clock={clock}
          onMoveComplete={
            position === word.length - 1 ? onComplete : undefined
          }
        />
      ))}
    </Canvas>
  );
}
