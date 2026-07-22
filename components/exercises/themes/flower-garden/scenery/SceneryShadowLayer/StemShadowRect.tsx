import React from 'react';
import { Rect, Shader, Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import {
  MAX_STEM_SHADOW_LEAVES,
  SINGLE_STEM_SHADOW_SKSL,
  singleStemShadowDefaults,
} from '../../shaders/singleStemShadow.sksl';
import {
  MAX_SHADOW_LEAVES_PER_STEM,
  type ResolvedSceneryShadowStyle,
  type StemShadowSlot,
} from './pickSceneryShadowUniforms';

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
  const stemMargin = maxWidth * maxSoftness + STEM_RECT_MARGIN_EXTRA;

  let maxLeafShadowRadius = 0;
  for (const leaf of slot.leaves) {
    const r = leaf.size * singleStemShadowDefaults.leafShadowRadiusFraction;
    if (r > maxLeafShadowRadius) maxLeafShadowRadius = r;
  }
  const leafMargin = maxLeafShadowRadius * (1 + singleStemShadowDefaults.leafShadowSoftness) + STEM_RECT_MARGIN_EXTRA;

  return Math.max(stemMargin, leafMargin);
}

export type StemShadowRectProps = {
  slot: StemShadowSlot;
  layoutX: SharedValue<number[]> | null;
  layoutY: SharedValue<number[]> | null;
  style: ResolvedSceneryShadowStyle;
};

function padLeafArray(arr: readonly number[], target: number): number[] {
  'worklet';
  const out: number[] = [];
  for (let i = 0; i < Math.min(arr.length, target); i++) {
    out.push(arr[i] ?? 0);
  }
  for (let i = arr.length; i < target; i++) {
    out.push(0);
  }
  return out;
}

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

  const staticLeafT = React.useMemo(() => {
    return padLeafArray(
      slot.leaves.map(l => l.t),
      MAX_SHADOW_LEAVES_PER_STEM,
    );
  }, [slot.leaves]);

  const staticLeafSize = React.useMemo(() => {
    return padLeafArray(
      slot.leaves.map(l => l.size),
      MAX_SHADOW_LEAVES_PER_STEM,
    );
  }, [slot.leaves]);

  const staticLeafCount = Math.min(
    slot.leaves.length,
    MAX_STEM_SHADOW_LEAVES,
  );

  const rectX = useDerivedValue(() => {
    const x = layoutX?.value ?? [];
    const topX = x[slot.roseIndex] ?? slot.topX;
    return Math.min(slot.baseX, slot.controlX, topX) - margin;
  });
  const rectY = useDerivedValue(() => {
    const y = layoutY?.value ?? [];
    const topY = y[slot.roseIndex] ?? slot.topY;
    return Math.min(slot.baseY, slot.controlY, topY) - margin;
  });
  const rectW = useDerivedValue(() => {
    const x = layoutX?.value ?? [];
    const topX = x[slot.roseIndex] ?? slot.topX;
    return (
      Math.max(slot.baseX, slot.controlX, topX) -
      Math.min(slot.baseX, slot.controlX, topX) +
      2 * margin
    );
  });
  const rectH = useDerivedValue(() => {
    const y = layoutY?.value ?? [];
    const topY = y[slot.roseIndex] ?? slot.topY;
    return (
      Math.max(slot.baseY, slot.controlY, topY) -
      Math.min(slot.baseY, slot.controlY, topY) +
      2 * margin
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
      leafShadowOpacity:
        singleStemShadowDefaults.leafShadowOpacity,
      leafShadowRadiusFraction:
        singleStemShadowDefaults.leafShadowRadiusFraction,
      leafShadowSoftness: singleStemShadowDefaults.leafShadowSoftness,
      resolutionScale: 1.0,
      stemBase: [slot.baseX, slot.baseY],
      stemTop: [topX, topY],
      stemControl: [slot.controlX, slot.controlY],
      stemBaseWidth: slot.baseWidth,
      stemTopWidth: slot.topWidth,
      leafCount: staticLeafCount,
      leafT: staticLeafT,
      leafSize: staticLeafSize,
    };
  });

  return (
    <Rect x={rectX} y={rectY} width={rectW} height={rectH}>
      <Shader source={singleStemShadowEffect} uniforms={uniforms} />
    </Rect>
  );
}

export const StemShadowRect = React.memo(StemShadowRectImpl);
