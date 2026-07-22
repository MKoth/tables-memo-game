import React from 'react';
import { Rect, Shader, Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { ROSE_SHADOWS_SKSL } from '../../shaders/roseShadows.sksl';
import type { RoseShadowStaticUniforms } from './pickSceneryShadowUniforms';

function compileRoseShadowsEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(ROSE_SHADOWS_SKSL);
  if (!effect) {
    throw new Error('Failed to compile rose shadows shader');
  }
  return effect;
}

const roseShadowsEffect = compileRoseShadowsEffect();

const MAX_ROSE_SHADOWS = 64;

function padMotionArray(
  arr: readonly number[],
  target: number,
  fill = 0,
): number[] {
  'worklet';
  const out: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]!);
  }
  for (let i = arr.length; i < target; i++) {
    out.push(fill);
  }
  return out;
}

export type RoseShadowLayerProps = {
  staticUniforms: RoseShadowStaticUniforms;
  roseRadiusFraction: number;
  layoutX: SharedValue<number[]> | null;
  layoutY: SharedValue<number[]> | null;
  bodySizes: readonly number[];
  width: number;
  height: number;
};

function RoseShadowLayerImpl({
  staticUniforms,
  roseRadiusFraction,
  layoutX,
  layoutY,
  bodySizes,
  width,
  height,
}: RoseShadowLayerProps) {
  const uniforms = useDerivedValue(() => {
    const x = layoutX?.value ?? [];
    const y = layoutY?.value ?? [];
    const bodyCount = bodySizes.length;
    const xCount = x.length;
    const yCount = y.length;
    const limit = Math.min(xCount, yCount, bodyCount, MAX_ROSE_SHADOWS);
    const centers: number[] = [];
    const radii: number[] = [];
    for (let i = 0; i < limit; i++) {
      centers.push(x[i] ?? 0, y[i] ?? 0);
      radii.push((bodySizes[i] ?? 0) * roseRadiusFraction);
    }
    return {
      lightOffset: staticUniforms.lightOffset,
      shadowColor: staticUniforms.shadowColor,
      shadowOpacity: staticUniforms.shadowOpacity,
      shadowSoftness: staticUniforms.shadowSoftness,
      shadowSquash: staticUniforms.shadowSquash,
      stemShadowTopSkew: staticUniforms.stemShadowTopSkew,
      resolutionScale: 1.0,
      roseShadowCount: limit,
      roseShadowCenter: padMotionArray(centers, MAX_ROSE_SHADOWS * 2),
      roseShadowRadius: padMotionArray(radii, MAX_ROSE_SHADOWS),
      roseShadowBase: staticUniforms.roseShadowBase,
    };
  });

  if (width <= 0 || height <= 0) return null;

  return (
    <Rect x={0} y={0} width={width} height={height}>
      <Shader source={roseShadowsEffect} uniforms={uniforms} />
    </Rect>
  );
}

export const RoseShadowLayer = React.memo(RoseShadowLayerImpl);
