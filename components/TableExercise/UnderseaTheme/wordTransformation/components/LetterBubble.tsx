import React, { useEffect, useMemo } from 'react';
import {
  Glyphs,
  Group,
  type SkFont,
  type SkImage,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { SharedValue } from 'react-native-reanimated';
import { BubbleInstance } from '../../koi/bubbles/BubbleInstance';
import {
  BUBBLE_BURST_DURATION_MS,
  BUBBLE_IDLE_OPACITY,
  BUBBLE_IDLE_WOBBLE,
} from '../../koi/bubbles/bubbleAnimPresets';
import type { BubbleAnimState } from '../../koi/bubbles/bubbleAnimTypes';

const LABEL_STROKE_WIDTH = 2;
const LABEL_FILL_COLOR = '#ffffff';
const LABEL_STROKE_COLOR = '#0a2840';
const LABEL_WRONG_COLOR = '#ff5a5a';
const ENTER_DURATION_MS = 320;
const MOVE_DURATION_MS = 240;

export type LetterBubbleStatus = 'idle' | 'wrong' | 'popped';

export type LetterBubbleProps = {
  char: string;
  centerX: number;
  centerY: number;
  diameter: number;
  status: LetterBubbleStatus;
  image: SkImage;
  font: SkFont;
  clock: SharedValue<number>;
  onPopComplete?: () => void;
};

export function LetterBubble({
  char,
  centerX,
  centerY,
  diameter,
  status,
  image,
  font,
  clock,
  onPopComplete,
}: LetterBubbleProps) {
  const posX = useSharedValue(centerX);
  const posY = useSharedValue(centerY);
  const dia = useSharedValue(diameter);
  const wiggle = useSharedValue(0);
  const popT = useSharedValue(0);
  const enterT = useSharedValue(0);

  useEffect(() => {
    enterT.value = withTiming(1, {
      duration: ENTER_DURATION_MS,
      easing: Easing.out(Easing.back(1.6)),
    });
  }, [enterT]);

  useEffect(() => {
    posX.value = withTiming(centerX, { duration: MOVE_DURATION_MS });
    posY.value = withTiming(centerY, { duration: MOVE_DURATION_MS });
    dia.value = diameter;
  }, [centerX, centerY, diameter, dia, posX, posY]);

  useEffect(() => {
    if (status !== 'wrong') {
      return;
    }
    const amp = Math.max(5, diameter * 0.12);
    wiggle.value = withSequence(
      withTiming(-amp, { duration: 60 }),
      withTiming(amp, { duration: 110 }),
      withTiming(-amp * 0.8, { duration: 110 }),
      withTiming(amp * 0.6, { duration: 110 }),
      withTiming(0, { duration: 90 }),
    );
  }, [diameter, status, wiggle]);

  useEffect(() => {
    if (status !== 'popped') {
      return;
    }
    popT.value = withTiming(
      1,
      { duration: BUBBLE_BURST_DURATION_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        'worklet';
        if (finished && onPopComplete != null) {
          scheduleOnRN(onPopComplete);
        }
      },
    );
  }, [onPopComplete, popT, status]);

  const anim = useDerivedValue<BubbleAnimState>(() => {
    const enter = enterT.value;
    const pop = popT.value;
    const growT = Math.min(1, pop / 0.5);
    const enterScale = 0.35 + 0.65 * enter;
    const d = pop > 0 ? dia.value * (1 + 0.28 * growT) : dia.value * enterScale;
    const fade = pop < 0.55 ? 0 : Math.min(1, (pop - 0.55) / 0.45);
    const opacity = pop > 0 ? BUBBLE_IDLE_OPACITY * (1 - fade) : BUBBLE_IDLE_OPACITY * enter;
    const cx = posX.value + wiggle.value;
    const cy = posY.value;
    return {
      x: cx - d * 0.5,
      y: cy - d * 0.5,
      diameter: d,
      centerX: cx,
      centerY: cy,
      wobbleAmp: BUBBLE_IDLE_WOBBLE.wobbleAmp,
      wobbleSpeed: BUBBLE_IDLE_WOBBLE.wobbleSpeed,
      wobbleLobes: BUBBLE_IDLE_WOBBLE.wobbleLobes,
      opacity,
      labelOpacity: pop > 0 ? 1 - Math.min(1, pop / 0.5) : enter,
      captureVisualT: 1,
    };
  });

  const glyphs = useMemo(() => {
    const ids = font.getGlyphIDs(char);
    const textWidth = font.getTextWidth(char);
    const metrics = font.getMetrics();
    const offsetX = diameter * 0.5 - textWidth * 0.5;
    const offsetY = diameter * 0.5 - (metrics.ascent + metrics.descent) * 0.5;
    return ids.map((id) => ({ id, pos: vec(offsetX, offsetY) }));
  }, [char, diameter, font]);

  const labelTransform = useDerivedValue(() => {
    const { centerX: cx, centerY: cy, diameter: d } = anim.value;
    return [
      { translateX: cx - d * 0.5 },
      { translateY: cy - d * 0.5 },
    ];
  });

  const labelOpacity = useDerivedValue(() => anim.value.labelOpacity);
  const fillColor = status === 'wrong' ? LABEL_WRONG_COLOR : LABEL_FILL_COLOR;

  return (
    <Group>
      <BubbleInstance image={image} anim={anim} clock={clock} />
      <Group transform={labelTransform} opacity={labelOpacity}>
        <Group
          style="stroke"
          strokeWidth={LABEL_STROKE_WIDTH}
          strokeJoin="round"
          strokeCap="round"
          color={LABEL_STROKE_COLOR}>
          <Glyphs font={font} glyphs={glyphs} />
        </Group>
        <Glyphs font={font} glyphs={glyphs} color={fillColor} />
      </Group>
    </Group>
  );
}
