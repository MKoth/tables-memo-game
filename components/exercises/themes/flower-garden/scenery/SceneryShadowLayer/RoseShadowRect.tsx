import React, { useMemo } from 'react';
import { Rect, Shader, Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { SINGLE_ROSE_SHADOW_SKSL } from '../../shaders/singleRoseShadow.sksl';
import {
  pickRoseShadowRect,
  type RoseShadowRectStyle,
  type RoseShadowStaticUniforms,
} from './pickSceneryShadowUniforms';

function compileSingleRoseShadowEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(SINGLE_ROSE_SHADOW_SKSL);
  if (!effect) {
    throw new Error('Failed to compile single rose shadow shader');
  }
  return effect;
}

const singleRoseShadowEffect = compileSingleRoseShadowEffect();

export type RoseDiscStatic = {
  index: number;
  radius: number;
  baseX: number;
  baseY: number;
};

export type RoseShadowRectProps = {
  disc: RoseDiscStatic;
  staticUniforms: RoseShadowStaticUniforms;
  layoutX: SharedValue<number[]> | null;
  layoutY: SharedValue<number[]> | null;
};

function RoseShadowRectImpl({
  disc,
  staticUniforms,
  layoutX,
  layoutY,
}: RoseShadowRectProps) {
  const style = useMemo<RoseShadowRectStyle>(
    () => ({
      lightOffset: staticUniforms.lightOffset,
      stemShadowTopSkew: staticUniforms.stemShadowTopSkew,
      shadowSquash: staticUniforms.shadowSquash,
    }),
    [
      staticUniforms.lightOffset,
      staticUniforms.stemShadowTopSkew,
      staticUniforms.shadowSquash,
    ],
  );

  const rect = useDerivedValue(() => {
    const x = layoutX?.value ?? [];
    const y = layoutY?.value ?? [];
    return pickRoseShadowRect(
      x[disc.index] ?? 0,
      y[disc.index] ?? 0,
      disc.baseX,
      disc.baseY,
      disc.radius,
      style,
    );
  });

  const rectX = useDerivedValue(() => rect.value.x);
  const rectY = useDerivedValue(() => rect.value.y);
  const rectW = useDerivedValue(() => rect.value.width);
  const rectH = useDerivedValue(() => rect.value.height);

  const uniforms = useDerivedValue(() => {
    const x = layoutX?.value ?? [];
    const y = layoutY?.value ?? [];
    return {
      lightOffset: staticUniforms.lightOffset,
      shadowColor: staticUniforms.shadowColor,
      shadowOpacity: staticUniforms.shadowOpacity,
      shadowSoftness: staticUniforms.shadowSoftness,
      shadowSquash: staticUniforms.shadowSquash,
      stemShadowTopSkew: staticUniforms.stemShadowTopSkew,
      resolutionScale: 1.0,
      roseCenter: [x[disc.index] ?? 0, y[disc.index] ?? 0],
      roseRadius: disc.radius,
      roseBase: [disc.baseX, disc.baseY],
    };
  });

  return (
    <Rect x={rectX} y={rectY} width={rectW} height={rectH}>
      <Shader source={singleRoseShadowEffect} uniforms={uniforms} />
    </Rect>
  );
}

export const RoseShadowRect = React.memo(RoseShadowRectImpl);
