import React, { useMemo } from 'react';
import { Glyphs, Group, vec, type SkFont } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import {
  WORD_SPRITE_LABEL_COLORS_BY_INDEX,
  WORD_SPRITE_PERSISTENT_HIGHLIGHT_LABEL_COLORS,
  type PersistentHighlightKind,
} from '../presets/wordSpriteTintPresets';
import { LABEL_STROKE_WIDTH, LABEL_TILT_PX } from '../config/wordSpriteTableLayerConfig';
import type { CellConfig } from '../helpers/cellConfigBuilders';

export type CellLabelProps = {
  config: CellConfig;
  displayLabel?: string;
  font: SkFont;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  motionAngle: SharedValue<number>;
  motionAmp: SharedValue<number>;
  retainedLabelRotation: SharedValue<number>;
  tintFlashPreset: SharedValue<number[]>;
  tintFlashUntil: SharedValue<number[]>;
  clock: SharedValue<number>;
  labelBaseRotation: number;
  persistentHighlightKind?: PersistentHighlightKind | null;
};

export function CellLabel({
  config,
  displayLabel,
  font,
  layoutX,
  layoutY,
  layoutScale,
  motionAngle,
  motionAmp,
  retainedLabelRotation,
  tintFlashPreset,
  tintFlashUntil,
  clock,
  labelBaseRotation,
  persistentHighlightKind = null,
}: CellLabelProps) {
  const idx = config.index;
  const defaultFillColor = config.labelFillColor;
  const defaultStrokeColor = config.labelStrokeColor;
  const text = displayLabel ?? config.label;

  const staticGlyphs = useMemo(() => {
    const textWidth = font.getTextWidth(text);
    const metrics = font.getMetrics();
    const labelOffsetX = -textWidth / 2;
    const labelOffsetY = -(metrics.ascent + metrics.descent) / 2;
    const ids = font.getGlyphIDs(text);
    const widths = font.getGlyphWidths(ids);
    let x = labelOffsetX;
    return ids.map((id, i) => {
      const pos = vec(x, labelOffsetY);
      x += widths[i] ?? 0;
      return { id, pos };
    });
  }, [font, text]);

  const labelTransform = useDerivedValue(() => {
    const cx = layoutX.value[idx] ?? 0;
    const cy = layoutY.value[idx] ?? 0;
    const scale = layoutScale.value[idx] ?? 1;
    const amp = motionAmp.value;
    let tiltX = 0;
    let tiltY = 0;
    if (amp !== 0) {
      const px = amp * config.bellSize * scale * LABEL_TILT_PX;
      tiltX = Math.cos(motionAngle.value) * px;
      tiltY = Math.sin(motionAngle.value) * px;
    }
    const pivotX = cx + tiltX;
    const pivotY = cy + tiltY;
    // Glyphs are in local space centered at (0,0); translate to pivot then scale/rotate.
    return [
      { translateX: pivotX },
      { translateY: pivotY },
      { scale },
      { rotate: labelBaseRotation + retainedLabelRotation.value },
    ];
  });

  const labelFillColor = useDerivedValue(() => {
    const until = tintFlashUntil.value[idx] ?? 0;
    const presetIdx = tintFlashPreset.value[idx] ?? -1;
    if (clock.value < until && presetIdx >= 0) {
      return WORD_SPRITE_LABEL_COLORS_BY_INDEX[presetIdx]?.labelFillColor ?? defaultFillColor;
    }
    if (persistentHighlightKind != null) {
      return WORD_SPRITE_PERSISTENT_HIGHLIGHT_LABEL_COLORS[persistentHighlightKind]
        .labelFillColor;
    }
    return defaultFillColor;
  });

  const labelStrokeColor = useDerivedValue(() => {
    const until = tintFlashUntil.value[idx] ?? 0;
    const presetIdx = tintFlashPreset.value[idx] ?? -1;
    if (clock.value < until && presetIdx >= 0) {
      return WORD_SPRITE_LABEL_COLORS_BY_INDEX[presetIdx]?.labelStrokeColor ?? defaultStrokeColor;
    }
    if (persistentHighlightKind != null) {
      return WORD_SPRITE_PERSISTENT_HIGHLIGHT_LABEL_COLORS[persistentHighlightKind]
        .labelStrokeColor;
    }
    return defaultStrokeColor;
  });

  return (
    <Group transform={labelTransform}>
      <Group
        style="stroke"
        strokeWidth={LABEL_STROKE_WIDTH}
        strokeJoin="round"
        strokeCap="round"
        color={labelStrokeColor}
      >
        <Glyphs font={font} glyphs={staticGlyphs} />
      </Group>
      <Glyphs font={font} glyphs={staticGlyphs} color={labelFillColor} />
    </Group>
  );
}
