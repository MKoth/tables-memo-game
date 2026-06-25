import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Glyphs,
  Group,
  matchFont,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { BubbleInstance } from './BubbleInstance';
import { SWIM_ZONE_TOP_RATIO } from './KoiFishLayer';
import { useUnderseaClock } from './UnderseaClockContext';

const BUBBLE_DIAMETER_RATIO = 0.9;
const LABEL_STROKE_WIDTH = 2;
const LABEL_FILL_COLOR = '#ffffff';
const LABEL_STROKE_COLOR = '#0a2840';

export type KoiWordBubbleProps = {
  word: string;
  onDismiss: () => void;
};

export function KoiWordBubble({ word, onDismiss }: KoiWordBubbleProps) {
  const { width, height } = useWindowDimensions();
  const clock = useUnderseaClock();
  const bubbleImage = useImage(require('../../../assets/bubble.png'));

  const diameter = width * BUBBLE_DIAMETER_RATIO;
  const swimZoneHeight = height * (1 - SWIM_ZONE_TOP_RATIO);
  const centerX = width * 0.5;
  const centerY = height * SWIM_ZONE_TOP_RATIO + swimZoneHeight * 0.5;
  const left = centerX - diameter * 0.5;
  const top = centerY - diameter * 0.5;

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const font = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: Math.max(18, diameter * 0.09),
        fontWeight: '600',
      }),
    [fontFamily, diameter],
  );

  const staticGlyphs = useMemo(() => {
    const textWidth = font.getTextWidth(word);
    const metrics = font.getMetrics();
    const labelOffsetX = diameter * 0.5 - textWidth * 0.5;
    const labelOffsetY = diameter * 0.5 - (metrics.ascent + metrics.descent) * 0.5;
    const ids = font.getGlyphIDs(word);
    const widths = font.getGlyphWidths(ids);
    let x = labelOffsetX;
    return ids.map((id, i) => {
      const pos = vec(x, labelOffsetY);
      x += widths[i] ?? 0;
      return { id, pos };
    });
  }, [font, word, diameter]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        'worklet';
        runOnJS(handleDismiss)();
      }),
    [handleDismiss],
  );

  if (!bubbleImage || width === 0 || height === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, { left, top, width: diameter, height: diameter }]}
      pointerEvents="box-none">
      <Canvas style={{ width: diameter, height: diameter }} pointerEvents="none" />
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <BubbleInstance
          image={bubbleImage}
          x={0}
          y={0}
          width={diameter}
          height={diameter}
          clock={clock}
        />
        <Group>
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
      </Canvas>
      <GestureDetector gesture={tapGesture}>
        <View style={StyleSheet.absoluteFill} />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
});
