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
} from '../../../../shaders/bubbleDeform.sksl';
import type { BubbleAnimState } from './useBubbleAnimation';

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
  bgCutoff: defaultBgCutoff,
  centerClear: defaultCenterClear,
  rimClear: defaultRimClear,
} = bubbleDeformUniformDefaults;

export type BubbleInstanceProps = {
  image: SkImage;
  anim: SharedValue<BubbleAnimState>;
  clock: SharedValue<number>;
  phase?: number;
  bgCutoff?: number;
  centerClear?: number;
  rimClear?: number;
};

export function BubbleInstance({
  image,
  anim,
  clock,
  phase = defaultPhase,
  bgCutoff = defaultBgCutoff,
  centerClear = defaultCenterClear,
  rimClear = defaultRimClear,
}: BubbleInstanceProps) {
  const bounds = useDerivedValue(() => {
    const { x, y, diameter } = anim.value;
    return Skia.XYWHRect(x, y, diameter, diameter);
  });

  const imageRect = useDerivedValue(() => {
    const { x, y, diameter } = anim.value;
    return Skia.XYWHRect(x, y, diameter, diameter);
  });

  const uniforms = useDerivedValue(() => {
    const { x, y, diameter, wobbleAmp, wobbleSpeed, wobbleLobes, opacity } = anim.value;
    return {
      bubbleX: x,
      bubbleY: y,
      bubbleW: diameter,
      bubbleH: diameter,
      iTime: clock.value / 1000,
      phase,
      wobbleAmp,
      wobbleSpeed,
      wobbleLobes,
      opacity,
      bgCutoff,
      centerClear,
      rimClear,
    };
  });

  return (
    <Rect rect={bounds}>
      <Shader source={bubbleEffect} uniforms={uniforms}>
        <ImageShader
          image={image}
          rect={imageRect}
          fit="fill"
          tx="clamp"
          ty="clamp"
          sampling={SPRITE_SAMPLING}
        />
      </Shader>
    </Rect>
  );
}
