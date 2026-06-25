import React from 'react';
import {
  FilterMode,
  ImageShader,
  MipmapMode,
  Rect,
  Shader,
  Skia,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import {
  BUBBLE_DEFORM_SKSL,
  bubbleDeformUniformDefaults,
} from '../../../shaders/bubbleDeform.sksl';

function compileBubbleEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(BUBBLE_DEFORM_SKSL);
  if (!effect) {
    throw new Error('Failed to compile bubble deform shader');
  }
  return effect;
}

const bubbleEffect = compileBubbleEffect();

const SPRITE_SAMPLING = {
  filter: FilterMode.Linear,
  mipmap: MipmapMode.Linear,
} as const;

const {
  phase: defaultPhase,
  wobbleAmp: defaultWobbleAmp,
  wobbleSpeed: defaultWobbleSpeed,
  wobbleLobes: defaultWobbleLobes,
  opacity: defaultOpacity,
  bgCutoff: defaultBgCutoff,
  centerClear: defaultCenterClear,
  rimClear: defaultRimClear,
} = bubbleDeformUniformDefaults;

export type BubbleInstanceProps = {
  image: SkImage;
  x: number;
  y: number;
  width: number;
  height: number;
  clock: SharedValue<number>;
  phase?: number;
  wobbleAmp?: number;
  wobbleSpeed?: number;
  wobbleLobes?: number;
  opacity?: number;
  bgCutoff?: number;
  centerClear?: number;
  rimClear?: number;
};

export function BubbleInstance({
  image,
  x,
  y,
  width,
  height,
  clock,
  phase = defaultPhase,
  wobbleAmp = defaultWobbleAmp,
  wobbleSpeed = defaultWobbleSpeed,
  wobbleLobes = defaultWobbleLobes,
  opacity = defaultOpacity,
  bgCutoff = defaultBgCutoff,
  centerClear = defaultCenterClear,
  rimClear = defaultRimClear,
}: BubbleInstanceProps) {
  const uniforms = useDerivedValue(() => ({
    bubbleX: x,
    bubbleY: y,
    bubbleW: width,
    bubbleH: height,
    iTime: clock.value / 1000,
    phase,
    wobbleAmp,
    wobbleSpeed,
    wobbleLobes,
    opacity,
    bgCutoff,
    centerClear,
    rimClear,
  }));

  return (
    <Rect x={x} y={y} width={width} height={height}>
      <Shader source={bubbleEffect} uniforms={uniforms}>
        <ImageShader
          image={image}
          x={x}
          y={y}
          width={width}
          height={height}
          fit="fill"
          tx="clamp"
          ty="clamp"
          sampling={SPRITE_SAMPLING}
        />
      </Shader>
    </Rect>
  );
}
