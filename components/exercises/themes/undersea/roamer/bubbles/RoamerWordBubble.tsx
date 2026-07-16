import React, { useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Glyphs,
  Group,
  matchFont,
  vec,
} from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { useBubbleTapGesture } from '../gestures/useBubbleTapGesture';
import { BubbleInstance } from './BubbleInstance';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useExerciseLayout } from '../../../../core';
import { useExerciseClock } from '../../../../core';
import {
  type BubbleAnimState,
  type BurstIntentValue,
} from './useBubbleAnimation';

const LABEL_STROKE_WIDTH = 2;
const LABEL_FILL_COLOR = '#ffffff';
const LABEL_STROKE_COLOR = '#0a2840';

export type RoamerWordBubbleProps = {
  word: string;
  anim: SharedValue<BubbleAnimState>;
  phase: SharedValue<number>;
  escapeActive?: SharedValue<boolean>;
  startBurst: (intent?: BurstIntentValue) => void;
  capturedFish: React.ReactNode;
  interactive?: boolean;
  targetDiameter: number;
};

export function RoamerWordBubble({
  word,
  anim,
  phase,
  escapeActive,
  startBurst,
  capturedFish,
  interactive = true,
  targetDiameter,
}: RoamerWordBubbleProps) {
  const { width, height } = useWindowDimensions();
  const { labelRotationRad } = useExerciseLayout();
  const clock = useExerciseClock();
  const { images } = useUnderseaThemeAssetsContext();
  const bubbleImage = images.bubble;

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

  const labelTransform = useDerivedValue(() => {
    const { centerX, centerY, diameter } = anim.value;
    return [
      { translateX: centerX },
      { translateY: centerY },
      { rotate: labelRotationRad },
      { translateX: -diameter * 0.5 },
      { translateY: -diameter * 0.5 },
    ];
  });

  const labelOpacity = useDerivedValue(() => anim.value.labelOpacity);

  const tapGesture = useBubbleTapGesture({
    anim,
    phase,
    escapeActive,
    startBurst,
  });

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents={interactive ? 'box-none' : 'none'}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {capturedFish}
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
      {interactive && (
        <GestureDetector gesture={tapGesture}>
          <View style={StyleSheet.absoluteFill} />
        </GestureDetector>
      )}
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
