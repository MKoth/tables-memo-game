import React from 'react';
import { FilterMode, ImageShader, MipmapMode, Rect, Shader, Skia, type SkImage, type SkRuntimeEffect } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { ROSE_BUD_SKSL } from '../../../shaders/roseBudDeform.sksl';
import type { FlowerCellConfig } from '../types';

function compileRoseBudEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(ROSE_BUD_SKSL);
  if (!effect) {
    throw new Error('Failed to compile rose bud shader');
  }
  return effect;
}

const roseBudEffect = compileRoseBudEffect();

const SPRITE_SAMPLING = {
  filter: FilterMode.Linear,
  mipmap: MipmapMode.Linear,
} as const;

export type CellRoseBudProps = {
  config: FlowerCellConfig;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  roseBudImage: SkImage;
};

export function CellRoseBud({
  config,
  layoutX,
  layoutY,
  layoutScale,
  roseBudImage,
}: CellRoseBudProps) {
  const idx = config.index;

  const uniforms = useDerivedValue(() => {
    const scale = layoutScale.value[idx] ?? 1;
    const cx = layoutX.value[idx] ?? 0;
    const cy = layoutY.value[idx] ?? 0;
    const size = config.bellSize * scale;
    const halfSize = size / 2;

    return {
      roseX: cx - halfSize,
      roseY: cy - halfSize,
      roseW: size,
      roseH: size,
    };
  });

  const rectX = useDerivedValue(() => uniforms.value.roseX);
  const rectY = useDerivedValue(() => uniforms.value.roseY);
  const rectSize = useDerivedValue(() => uniforms.value.roseW);

  return (
    <Rect x={rectX} y={rectY} width={rectSize} height={rectSize}>
      <Shader source={roseBudEffect} uniforms={uniforms}>
        <ImageShader
          image={roseBudImage}
          x={rectX}
          y={rectY}
          width={rectSize}
          height={rectSize}
          fit="fill"
          tx="clamp"
          ty="clamp"
          sampling={SPRITE_SAMPLING}
        />
      </Shader>
    </Rect>
  );
}
