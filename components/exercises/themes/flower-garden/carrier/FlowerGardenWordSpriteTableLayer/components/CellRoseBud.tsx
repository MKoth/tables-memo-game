import React from 'react';
import { FilterMode, ImageShader, MipmapMode, Rect, Shader, Skia, type SkImage, type SkRuntimeEffect } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { MAX_RINGS, ROSE_BUD_SKSL, roseBudUniformDefaults } from '../../../shaders/roseBudDeform.sksl';
import type { FlowerCellConfig } from '../types';

function padRingArray(arr: readonly number[]): number[] {
  return [...arr, ...Array(Math.max(0, MAX_RINGS - arr.length)).fill(0)];
}

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

const PADDED_PETALS_COUNT = padRingArray(roseBudUniformDefaults.petalsCount);
const PADDED_RING_RADIUS = padRingArray(roseBudUniformDefaults.ringRadius);
const PADDED_RING_BORDER = padRingArray(roseBudUniformDefaults.ringBorder);
const PADDED_PETAL_WIDTH = padRingArray(roseBudUniformDefaults.petalWidth);

export type CellRoseBudProps = {
  config: FlowerCellConfig;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  roseBudImage: SkImage;
  roseCenterImage: SkImage;
  petalImages: readonly SkImage[];
};

export function CellRoseBud({
  config,
  layoutX,
  layoutY,
  layoutScale,
  roseBudImage,
  roseCenterImage,
  petalImages,
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
      budInner: roseBudUniformDefaults.budInner,
      budOuter: roseBudUniformDefaults.budOuter,
      roseCenterDiameter: roseBudUniformDefaults.roseCenterDiameter,
      roseCenterBulge: roseBudUniformDefaults.roseCenterBulge,
      ringsCount: roseBudUniformDefaults.ringsCount,
      petalsCount: PADDED_PETALS_COUNT,
      ringRadius: PADDED_RING_RADIUS,
      ringBorder: PADDED_RING_BORDER,
      petalWidth: PADDED_PETAL_WIDTH,
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
        <ImageShader
          image={roseCenterImage}
          x={rectX}
          y={rectY}
          width={rectSize}
          height={rectSize}
          fit="fill"
          tx="clamp"
          ty="clamp"
          sampling={SPRITE_SAMPLING}
        />
        <ImageShader
          image={petalImages[0]}
          x={rectX}
          y={rectY}
          width={rectSize}
          height={rectSize}
          fit="fill"
          tx="clamp"
          ty="clamp"
          sampling={SPRITE_SAMPLING}
        />
        <ImageShader
          image={petalImages[1]}
          x={rectX}
          y={rectY}
          width={rectSize}
          height={rectSize}
          fit="fill"
          tx="clamp"
          ty="clamp"
          sampling={SPRITE_SAMPLING}
        />
        <ImageShader
          image={petalImages[2]}
          x={rectX}
          y={rectY}
          width={rectSize}
          height={rectSize}
          fit="fill"
          tx="clamp"
          ty="clamp"
          sampling={SPRITE_SAMPLING}
        />
        <ImageShader
          image={petalImages[3]}
          x={rectX}
          y={rectY}
          width={rectSize}
          height={rectSize}
          fit="fill"
          tx="clamp"
          ty="clamp"
          sampling={SPRITE_SAMPLING}
        />
        <ImageShader
          image={petalImages[4]}
          x={rectX}
          y={rectY}
          width={rectSize}
          height={rectSize}
          fit="fill"
          tx="clamp"
          ty="clamp"
          sampling={SPRITE_SAMPLING}
        />
        <ImageShader
          image={petalImages[5]}
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
