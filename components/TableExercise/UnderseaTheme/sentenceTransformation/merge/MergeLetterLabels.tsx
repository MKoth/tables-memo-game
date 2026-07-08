import React, { useMemo } from 'react';
import { Glyphs, Group, vec, type SkFont } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { LetterLayout } from '../../core/layout/underseaExerciseLayout';
import {
  interpolateMergeLetterState,
  interpolateMergeLetterStateAt,
} from './mergeLayout';

const LABEL_STROKE_WIDTH = 2;
const LABEL_FILL_COLOR = '#ffffff';
const LABEL_STROKE_COLOR = '#0a2840';

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

function mix(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

function smoothStep(edge0: number, edge1: number, x: number): number {
  'worklet';
  if (edge1 === edge0) {
    return x >= edge1 ? 1 : 0;
  }
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

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
    const { centerX, centerY } = interpolateMergeLetterStateAt(
      initialCenterX,
      rowY,
      initialDiameter,
      mergeCenterX,
      mergeDiameter,
      mergeProgress.value,
      position,
      layout.centers.length,
    );
    const ox = initialDiameter * 0.5;
    const oy = initialDiameter * 0.5;
    return [
      { translateX: centerX - ox },
      { translateY: centerY - oy },
    ];
  });

  const labelOpacity = useDerivedValue(() => {
    // Keep letters fully opaque during merge so they form the final word.
    return 1;
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
    <Group transform={labelTransform} opacity={labelOpacity}>
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
