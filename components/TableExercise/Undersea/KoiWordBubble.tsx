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
import { runOnJS, useDerivedValue } from 'react-native-reanimated';
import { BubbleInstance } from './BubbleInstance';
import { SWIM_ZONE_TOP_RATIO } from './KoiFishLayer';
import { useUnderseaClock } from './UnderseaClockContext';
import {
  BubblePhase,
  isTapInsideBubble,
  useBubbleAnimation,
} from './useBubbleAnimation';

const BUBBLE_DIAMETER_RATIO = 0.9;
const LABEL_STROKE_WIDTH = 2;
const LABEL_FILL_COLOR = '#ffffff';
const LABEL_STROKE_COLOR = '#0a2840';
const TAP_MAX_DISTANCE_PX = 10;

export type KoiWordBubbleProps = {
  word: string;
  originX: number;
  originY: number;
  onDismiss: () => void;
};

export function KoiWordBubble({ word, originX, originY, onDismiss }: KoiWordBubbleProps) {
  const { width, height } = useWindowDimensions();
  const clock = useUnderseaClock();
  const bubbleImage = useImage(require('../../../assets/bubble.png'));

  const targetDiameter = width * BUBBLE_DIAMETER_RATIO;
  const swimZoneHeight = height * (1 - SWIM_ZONE_TOP_RATIO);
  const targetCenterX = width * 0.5;
  const targetCenterY = height * SWIM_ZONE_TOP_RATIO + swimZoneHeight * 0.5;

  const animationConfig = useMemo(
    () => ({
      originX,
      originY,
      targetCenterX,
      targetCenterY,
      targetDiameter,
    }),
    [originX, originY, targetCenterX, targetCenterY, targetDiameter],
  );

  const { anim, phase, startBurst } = useBubbleAnimation(animationConfig, onDismiss);

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const font = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: Math.max(18, targetDiameter * 0.09),
        fontWeight: '600',
      }),
    [fontFamily, targetDiameter],
  );

  const staticGlyphs = useMemo(() => {
    const textWidth = font.getTextWidth(word);
    const metrics = font.getMetrics();
    const labelOffsetX = targetDiameter * 0.5 - textWidth * 0.5;
    const labelOffsetY =
      targetDiameter * 0.5 - (metrics.ascent + metrics.descent) * 0.5;
    const ids = font.getGlyphIDs(word);
    const widths = font.getGlyphWidths(ids);
    let x = labelOffsetX;
    return ids.map((id, i) => {
      const pos = vec(x, labelOffsetY);
      x += widths[i] ?? 0;
      return { id, pos };
    });
  }, [font, word, targetDiameter]);

  const labelTransform = useDerivedValue(() => [
    { translateX: anim.value.x },
    { translateY: anim.value.y },
  ]);

  const labelOpacity = useDerivedValue(() => anim.value.labelOpacity);

  const handleBurst = useCallback(() => {
    startBurst();
  }, [startBurst]);

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(TAP_MAX_DISTANCE_PX)
        .onEnd((e) => {
          'worklet';
          if (phase.value !== BubblePhase.Idle) {
            return;
          }
          if (!isTapInsideBubble(e.x, e.y, anim.value)) {
            return;
          }
          runOnJS(handleBurst)();
        }),
    [anim, handleBurst, phase],
  );

  if (!bubbleImage || width === 0 || height === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <BubbleInstance image={bubbleImage} anim={anim} clock={clock} />
        <Group transform={labelTransform} opacity={labelOpacity}>
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
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
