import React, { useMemo } from 'react';
import { Glyphs, Group, vec, type SkFont } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { LetterLayout } from '../../core/layout/underseaExerciseLayout';
import { interpolateMergeLetterStateAt } from './mergeLayout';

const LABEL_STROKE_WIDTH = 2;
const LABEL_FILL_COLOR = '#ffffff';
const LABEL_STROKE_COLOR = '#0a2840';

export type MergeLetterLabelsProps = {
  word: string;
  mergeProgress: SharedValue<number>;
  layout: LetterLayout;
  mergeCenterX: number;
  mergeDiameter: number;
  font: SkFont;
};

type MergeLetterLabelProps = {
  char: string;
  position: number;
  mergeProgress: SharedValue<number>;
  layout: LetterLayout;
  mergeCenterX: number;
  mergeDiameter: number;
  font: SkFont;
};

function MergeLetterLabel({
  char,
  position,
  mergeProgress,
  layout,
  mergeCenterX,
  mergeDiameter,
  font,
}: MergeLetterLabelProps) {
  const initialCenterX = layout.centers[position] ?? mergeCenterX;
  const initialDiameter = layout.diameter;
  const rowY = layout.rowY;

  const labelTransform = useDerivedValue(() => {
    const state = interpolateMergeLetterStateAt(
      initialCenterX,
      rowY,
      initialDiameter,
      mergeCenterX,
      mergeDiameter,
      mergeProgress.value,
    );
    const { centerX, centerY, diameter } = state;
    const ox = initialDiameter * 0.5;
    const oy = initialDiameter * 0.5;
    const scale = initialDiameter > 0 ? diameter / initialDiameter : 1;
    return [
      { translateX: centerX - diameter * 0.5 },
      { translateY: centerY - diameter * 0.5 },
      { translateX: ox },
      { translateY: oy },
      { scale },
      { translateX: -ox },
      { translateY: -oy },
    ];
  });

  const glyphs = useMemo(() => {
    const ids = font.getGlyphIDs(char);
    const textWidth = font.getTextWidth(char);
    const metrics = font.getMetrics();
    const offsetX = initialDiameter * 0.5 - textWidth * 0.5;
    const offsetY = initialDiameter * 0.5 - (metrics.ascent + metrics.descent) * 0.5;
    return ids.map((id) => ({ id, pos: vec(offsetX, offsetY) }));
  }, [char, font, initialDiameter]);

  return (
    <Group transform={labelTransform}>
      <Group
        style="stroke"
        strokeWidth={LABEL_STROKE_WIDTH}
        strokeJoin="round"
        strokeCap="round"
        color={LABEL_STROKE_COLOR}>
        <Glyphs font={font} glyphs={glyphs} />
      </Group>
      <Glyphs font={font} glyphs={glyphs} color={LABEL_FILL_COLOR} />
    </Group>
  );
}

export function MergeLetterLabels({
  word,
  mergeProgress,
  layout,
  mergeCenterX,
  mergeDiameter,
  font,
}: MergeLetterLabelsProps) {
  return (
    <>
      {word.split('').map((char, position) => (
        <MergeLetterLabel
          key={`merge-label-${position}`}
          char={char}
          position={position}
          mergeProgress={mergeProgress}
          layout={layout}
          mergeCenterX={mergeCenterX}
          mergeDiameter={mergeDiameter}
          font={font}
        />
      ))}
    </>
  );
}
