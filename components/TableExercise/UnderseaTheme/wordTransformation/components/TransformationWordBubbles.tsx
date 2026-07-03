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

/** Vertical placement of the current-word bubble row inside the koi zone. */
export const TRANSFORMATION_WORD_ROW_Y_RATIO = 0.2;
/** Vertical placement of the insert-variant bubble row inside the koi zone. */
export const TRANSFORMATION_VARIANT_ROW_Y_RATIO = 0.65;

export type LetterLayout = {
  diameter: number;
  rowY: number;
  centers: number[];
};

export function computeLetterLayout(
  koiRect: ZoneRect,
  count: number,
  rowYRatio = TRANSFORMATION_WORD_ROW_Y_RATIO,
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

export type InsertPreviewLayout = {
  insertIndex: number;
  insertLength: number;
  targetLetterCount: number;
};

export function previewCenterForLetter(
  position: number,
  preview: InsertPreviewLayout,
  targetLayout: LetterLayout,
): number {
  const targetIndex =
    position < preview.insertIndex ? position : position + preview.insertLength;
  return targetLayout.centers[targetIndex] ?? 0;
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
