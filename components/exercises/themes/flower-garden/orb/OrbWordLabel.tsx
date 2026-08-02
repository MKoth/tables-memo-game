import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { Glyphs, Group, matchFont, vec, type SkFont } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import type { OrbAnimState } from './orbAnimTypes';

const LABEL_STROKE_WIDTH = 2;
const LABEL_FILL_COLOR = '#ffffff';
const LABEL_STROKE_COLOR = '#0a2840';

export type OrbWordLabelProps = {
  word: string;
  anim: SharedValue<OrbAnimState>;
  targetDiameter: number;
};

export function OrbWordLabel({ word, anim, targetDiameter }: OrbWordLabelProps) {
  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const font: SkFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: Math.max(24, targetDiameter * 0.13),
        fontWeight: '600',
      }),
    [fontFamily, targetDiameter],
  );

  const staticGlyphs = useMemo(() => {
    const textWidth = font.getTextWidth(word);
    const metrics = font.getMetrics();
    const labelOffsetX = -textWidth / 2;
    const labelOffsetY = -(metrics.ascent + metrics.descent) / 2;
    const ids = font.getGlyphIDs(word);
    const widths = font.getGlyphWidths(ids);
    let x = labelOffsetX;
    return ids.map((id, i) => {
      const pos = vec(x, labelOffsetY);
      x += widths[i] ?? 0;
      return { id, pos };
    });
  }, [font, word]);

  const labelOpacity = useDerivedValue(() => {
    const { overallOpacity, captureVisualT } = anim.value;
    return overallOpacity * Math.max(0, Math.min(1, captureVisualT));
  });

  const labelTransform = useDerivedValue(() => {
    const { centerX, centerY } = anim.value;
    return [
      { translateX: centerX },
      { translateY: centerY },
    ];
  });

  return (
    <Group opacity={labelOpacity} transform={labelTransform}>
      <Group
        style="stroke"
        strokeWidth={LABEL_STROKE_WIDTH}
        strokeJoin="round"
        strokeCap="round"
        color={LABEL_STROKE_COLOR}>
        <Glyphs font={font} glyphs={staticGlyphs} />
      </Group>
      <Glyphs font={font} glyphs={staticGlyphs} color={LABEL_FILL_COLOR} />
    </Group>
  );
}
