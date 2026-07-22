import React from 'react';
import { Rect, Shader, Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { SINGLE_STEM_SHADOW_SKSL } from '../../shaders/singleStemShadow.sksl';
import type { ResolvedSceneryShadowStyle, StemShadowSlot } from './pickSceneryShadowUniforms';

function compileSingleStemShadowEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(SINGLE_STEM_SHADOW_SKSL);
  if (!effect) {
    throw new Error('Failed to compile single stem shadow shader');
  }
  return effect;
}

const singleStemShadowEffect = compileSingleStemShadowEffect();

const STEM_RECT_MARGIN_EXTRA = 2;

function computeStemRectMargin(
  slot: StemShadowSlot,
  style: ResolvedSceneryShadowStyle,
): number {
  const maxWidth = Math.max(slot.baseWidth, slot.topWidth);
  const maxSoftness = Math.max(
    style.shadowSoftness,
    style.shadowSoftness + style.stemShadowTopBlur,
  );
  return maxWidth * maxSoftness + STEM_RECT_MARGIN_EXTRA;
}

export type StemShadowRectProps = {
  slot: StemShadowSlot;
  layoutX: SharedValue<number[]> | null;
  layoutY: SharedValue<number[]> | null;
  style: ResolvedSceneryShadowStyle;
};

function StemShadowRectImpl({
  slot,
  layoutX,
  layoutY,
  style,
}: StemShadowRectProps) {
  const margin = React.useMemo(
    () => computeStemRectMargin(slot, style),
    [slot, style],
  );

  const rectX = useDerivedValue(() => {
    const x = layoutX?.value ?? [];
    const topX = x[slot.roseIndex] ?? slot.topX;
    return Math.min(slot.baseX, topX) - margin;
  });
  const rectY = useDerivedValue(() => {
    const y = layoutY?.value ?? [];
    const topY = y[slot.roseIndex] ?? slot.topY;
    return Math.min(slot.baseY, topY) - margin;
  });
  const rectW = useDerivedValue(() => {
    const x = layoutX?.value ?? [];
    const topX = x[slot.roseIndex] ?? slot.topX;
    return (
      Math.max(slot.baseX, topX) - Math.min(slot.baseX, topX) + 2 * margin
    );
  });
  const rectH = useDerivedValue(() => {
    const y = layoutY?.value ?? [];
    const topY = y[slot.roseIndex] ?? slot.topY;
    return (
      Math.max(slot.baseY, topY) - Math.min(slot.baseY, topY) + 2 * margin
    );
  });

  const uniforms = useDerivedValue(() => {
    const x = layoutX?.value ?? [];
    const y = layoutY?.value ?? [];
    const topX = x[slot.roseIndex] ?? slot.topX;
    const topY = y[slot.roseIndex] ?? slot.topY;
    return {
      lightOffset: style.lightOffset,
      shadowColor: style.shadowColor,
      shadowOpacity: style.shadowOpacity,
      shadowSoftness: style.shadowSoftness,
      stemShadowTopSkew: style.stemShadowTopSkew,
      stemShadowTopBlur: style.stemShadowTopBlur,
      resolutionScale: 1.0,
      stemBase: [slot.baseX, slot.baseY],
      stemTop: [topX, topY],
      stemBaseWidth: slot.baseWidth,
      stemTopWidth: slot.topWidth,
    };
  });

  return (
    <Rect x={rectX} y={rectY} width={rectW} height={rectH}>
      <Shader source={singleStemShadowEffect} uniforms={uniforms} />
    </Rect>
  );
}

export const StemShadowRect = React.memo(StemShadowRectImpl);
