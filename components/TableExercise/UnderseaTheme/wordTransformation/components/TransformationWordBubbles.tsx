import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeClock } from '../../core/clock/UnderseaThemeClockProvider';
import { useUnderseaThemeLayout } from '../../core/providers/UnderseaThemeLayoutProvider';
import type { ZoneRect } from '../../core/layout/computeUnderseaThemeLayout';
import { LetterBubble, type LetterBubbleStatus } from './LetterBubble';
import type { LetterBubbleModel } from '../hooks/useWordTransformationGame';

const MIN_DIAMETER = 34;
const MAX_DIAMETER = 74;
const GAP_RATIO = 0.26;

export type LetterLayout = {
  diameter: number;
  rowY: number;
  centers: number[];
};

export function computeLetterLayout(
  koiRect: ZoneRect,
  count: number,
  rowYRatio = 0.4,
): LetterLayout {
  const rowY = koiRect.y + koiRect.h * rowYRatio;
  if (count <= 0) {
    return { diameter: MIN_DIAMETER, rowY, centers: [] };
  }

  const maxRowWidth = koiRect.w * 0.9;
  // Solve for diameter with gap = d * GAP_RATIO so the row fits maxRowWidth.
  const denom = count + (count - 1) * GAP_RATIO;
  const widthLimited = maxRowWidth / denom;
  const heightLimited = koiRect.h * 0.18;
  const diameter = Math.max(
    MIN_DIAMETER,
    Math.min(MAX_DIAMETER, widthLimited, heightLimited),
  );
  const gap = diameter * GAP_RATIO;
  const total = count * diameter + (count - 1) * gap;
  const startX = koiRect.x + koiRect.w * 0.5 - total * 0.5;

  const centers = Array.from(
    { length: count },
    (_, i) => startX + i * (diameter + gap) + diameter * 0.5,
  );

  return { diameter, rowY, centers };
}

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
  onLetterPress: (position: number) => void;
};

export function TransformationWordBubbles({
  letters,
  interactive = true,
  onLetterPress,
}: TransformationWordBubblesProps) {
  const { koiRect } = useUnderseaThemeLayout();
  const { images } = useUnderseaThemeAssetsContext();
  const clock = useUnderseaThemeClock();

  const layout = useMemo(
    () => computeLetterLayout(koiRect, letters.length),
    [koiRect, letters.length],
  );

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const font = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: Math.max(16, layout.diameter * 0.5),
        fontWeight: '700',
      }),
    [fontFamily, layout.diameter],
  );

  if (letters.length === 0) {
    return null;
  }

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {letters.map((letter, i) => (
          <LetterBubble
            key={letter.key}
            char={letter.char}
            centerX={layout.centers[i] ?? 0}
            centerY={layout.rowY}
            diameter={layout.diameter}
            status={statusFor(letter)}
            image={images.bubble}
            font={font}
            clock={clock}
          />
        ))}
      </Canvas>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {letters.map((letter, i) => {
          if (letter.popped) {
            return null;
          }
          const cx = layout.centers[i] ?? 0;
          return (
            <Pressable
              key={letter.key}
              disabled={!interactive}
              onPress={() => onLetterPress(letter.position)}
              style={[
                styles.hit,
                {
                  left: cx - layout.diameter * 0.5,
                  top: layout.rowY - layout.diameter * 0.5,
                  width: layout.diameter,
                  height: layout.diameter,
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
