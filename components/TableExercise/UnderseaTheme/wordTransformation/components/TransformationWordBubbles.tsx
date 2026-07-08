import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeClock } from '../../core/clock/UnderseaThemeClockProvider';
import { useUnderseaThemeLayout } from '../../core/providers/UnderseaThemeLayoutProvider';
import {
  computeLetterLayout,
  previewCenterForLetter,
  type InsertPreviewLayout,
} from '../../core/layout/underseaExerciseLayout';
import { LetterBubble, type LetterBubbleStatus } from './LetterBubble';
import type { LetterBubbleModel } from '../domain';

function statusFor(letter: LetterBubbleModel): LetterBubbleStatus {
  if (letter.popped) {
    return 'popped';
  }
  if (letter.wrong) {
    return 'wrong';
  }
  return 'idle';
}

export type TransformationWordBubblesProps = {
  letters: LetterBubbleModel[];
  interactive?: boolean;
  insertPreview?: InsertPreviewLayout;
  onLetterPress: (position: number) => void;
  /** Fired (UI-thread synced) as each letter bursts during the exit cascade. */
  playPop?: () => void;
  /** Fired (UI-thread synced) as each letter inflates during the enter cascade. */
  playInflate?: () => void;
};

export function TransformationWordBubbles({
  letters,
  interactive = true,
  insertPreview,
  onLetterPress,
  playPop,
  playInflate,
}: TransformationWordBubblesProps) {
  const { koiRect } = useUnderseaThemeLayout();
  const { images } = useUnderseaThemeAssetsContext();
  const clock = useUnderseaThemeClock();

  const layout = useMemo(
    () => computeLetterLayout(koiRect, letters.length),
    [koiRect, letters.length],
  );

  const previewLayout = useMemo(
    () =>
      insertPreview == null
        ? null
        : computeLetterLayout(koiRect, insertPreview.targetLetterCount),
    [insertPreview, koiRect],
  );

  const activeLayout = previewLayout ?? layout;

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const font = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: Math.max(16, activeLayout.diameter * 0.5),
        fontWeight: '700',
      }),
    [activeLayout.diameter, fontFamily],
  );

  if (letters.length === 0) {
    return null;
  }

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {letters.map((letter) => {
          const centerX =
            insertPreview != null && previewLayout != null
              ? previewCenterForLetter(letter.position, insertPreview, previewLayout)
              : (layout.centers[letter.position] ?? 0);

          return (
            <LetterBubble
              key={letter.key}
              char={letter.char}
              centerX={centerX}
              centerY={activeLayout.rowY}
              diameter={activeLayout.diameter}
              initialCenterX={letter.skipEnter ? centerX : undefined}
              initialCenterY={letter.skipEnter ? activeLayout.rowY : undefined}
              initialDiameter={letter.skipEnter ? activeLayout.diameter : undefined}
              skipEnter={letter.skipEnter}
              moveDurationMs={letter.skipEnter ? 0 : undefined}
              status={statusFor(letter)}
              popDelayMs={letter.popDelayMs}
              enterDelayMs={letter.enterDelayMs}
              onPopSound={letter.popDelayMs != null ? playPop : undefined}
              onEnterSound={letter.enterDelayMs != null ? playInflate : undefined}
              image={images.bubble}
              font={font}
              clock={clock}
            />
          );
        })}
      </Canvas>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {letters.map((letter) => {
          if (letter.popped) {
            return null;
          }
          const cx =
            insertPreview != null && previewLayout != null
              ? previewCenterForLetter(letter.position, insertPreview, previewLayout)
              : (layout.centers[letter.position] ?? 0);
          return (
            <Pressable
              key={letter.key}
              disabled={!interactive}
              onPress={() => onLetterPress(letter.position)}
              style={[
                styles.hit,
                {
                  left: cx - activeLayout.diameter * 0.5,
                  top: activeLayout.rowY - activeLayout.diameter * 0.5,
                  width: activeLayout.diameter,
                  height: activeLayout.diameter,
                },
              ]}
            />
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hit: {
    position: 'absolute',
    borderRadius: 999,
  },
});
