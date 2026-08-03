import React, { useMemo } from 'react';
import { Glyphs, Group, vec, type SkFont } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { ROSE_LABEL_STROKE_WIDTH, ROSE_LABEL_TILT_PX } from '../config/flowerTableLayerConfig';
import { ROSE_LABEL_FLASH_FILL_COLOR, ROSE_LABEL_FLASH_STROKE_COLOR } from '../presets/roseLabelPalette';
import type { FlowerCellConfig } from '../types';

export type FlowerRoseLabelProps = {
  config: FlowerCellConfig;
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
  fillColor: string;
  strokeColor: string;
  highlightFillColor?: string;
  highlightStrokeColor?: string;
};

export function FlowerRoseLabel({
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
  fillColor,
  strokeColor,
  highlightFillColor,
  highlightStrokeColor,
}: FlowerRoseLabelProps) {
  const idx = config.index;
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
      const px = amp * config.bellSize * scale * ROSE_LABEL_TILT_PX;
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
      { rotate: retainedLabelRotation.value },
    ];
  });

  const labelFillColor = useDerivedValue(() => {
    const until = tintFlashUntil.value[idx] ?? 0;
    const presetIdx = tintFlashPreset.value[idx] ?? -1;
    if (clock.value < until && presetIdx >= 0) {
      return ROSE_LABEL_FLASH_FILL_COLOR;
    }
    return highlightFillColor ?? fillColor;
  });

  const labelStrokeColor = useDerivedValue(() => {
    const until = tintFlashUntil.value[idx] ?? 0;
    const presetIdx = tintFlashPreset.value[idx] ?? -1;
    if (clock.value < until && presetIdx >= 0) {
      return ROSE_LABEL_FLASH_STROKE_COLOR;
    }
    return highlightStrokeColor ?? strokeColor;
  });

  return (
    <Group transform={labelTransform}>
      <Group
        style="stroke"
        strokeWidth={ROSE_LABEL_STROKE_WIDTH}
        strokeJoin="round"
        strokeCap="round"
        color={labelStrokeColor}>
        <Glyphs font={font} glyphs={staticGlyphs} />
      </Group>
      <Glyphs font={font} glyphs={staticGlyphs} color={labelFillColor} />
    </Group>
  );
}
