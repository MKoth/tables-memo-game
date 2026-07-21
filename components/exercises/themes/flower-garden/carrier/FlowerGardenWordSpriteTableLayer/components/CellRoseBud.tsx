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
const PADDED_RING_RADIUS_MIN = padRingArray(roseBudUniformDefaults.ringRadius.min);
const PADDED_RING_RADIUS_MAX = padRingArray(roseBudUniformDefaults.ringRadius.max);
const PADDED_RING_BORDER_MIN = padRingArray(roseBudUniformDefaults.ringBorder.min);
const PADDED_RING_BORDER_MAX = padRingArray(roseBudUniformDefaults.ringBorder.max);
const PADDED_PETAL_WIDTH_MIN = padRingArray(roseBudUniformDefaults.petalWidth.min);
const PADDED_PETAL_WIDTH_MAX = padRingArray(roseBudUniformDefaults.petalWidth.max);
const PADDED_RING_ROTATION_MIN = padRingArray(roseBudUniformDefaults.ringRotation.min);
const PADDED_RING_ROTATION_MAX = padRingArray(roseBudUniformDefaults.ringRotation.max);
const PADDED_RING_BORDER_DEVIATION = padRingArray(roseBudUniformDefaults.ringBorderDeviation);
const PADDED_PETAL_WIDTH_DEVIATION = padRingArray(roseBudUniformDefaults.petalWidthDeviation);

export type CellRoseBudProps = {
  config: FlowerCellConfig;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  layoutScaleMin: SharedValue<number[]>;
  layoutScaleMax: SharedValue<number[]>;
  clock: SharedValue<number>;
  roseBudImage: SkImage;
  roseCenterImage: SkImage;
  petalImages: readonly SkImage[];
};

export function CellRoseBud({
  config,
  layoutX,
  layoutY,
  layoutScale,
  layoutScaleMin,
  layoutScaleMax,
  clock,
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
    const cellMin = layoutScaleMin.value[idx] ?? 0;
    const cellMax = layoutScaleMax.value[idx] ?? 0;
    const cellRange = cellMax - cellMin;
    const rawCoef = cellRange > 1e-6 ? (scale - cellMin) / cellRange : 0;
    const coefficient = rawCoef < 0 ? 0 : rawCoef > 1 ? 1 : rawCoef;

    return {
      roseX: cx - halfSize,
      roseY: cy - halfSize,
      roseW: size,
      roseH: size,
      budInnerMin: roseBudUniformDefaults.budInner.min,
      budInnerMax: roseBudUniformDefaults.budInner.max,
      budOuterMin: roseBudUniformDefaults.budOuter.min,
      budOuterMax: roseBudUniformDefaults.budOuter.max,
      roseCenterDiameterMin: roseBudUniformDefaults.roseCenterDiameter.min,
      roseCenterDiameterMax: roseBudUniformDefaults.roseCenterDiameter.max,
      roseCenterBulgeMin: roseBudUniformDefaults.roseCenterBulge.min,
      roseCenterBulgeMax: roseBudUniformDefaults.roseCenterBulge.max,
      budRotationMin: roseBudUniformDefaults.budRotation.min,
      budRotationMax: roseBudUniformDefaults.budRotation.max,
      roseCenterRotationMin: roseBudUniformDefaults.roseCenterRotation.min,
      roseCenterRotationMax: roseBudUniformDefaults.roseCenterRotation.max,
      brightnessMin: roseBudUniformDefaults.brightness.min,
      brightnessMax: roseBudUniformDefaults.brightness.max,
      ringsCount: roseBudUniformDefaults.ringsCount,
      petalsCount: PADDED_PETALS_COUNT,
      ringRadiusMin: PADDED_RING_RADIUS_MIN,
      ringRadiusMax: PADDED_RING_RADIUS_MAX,
      ringBorderMin: PADDED_RING_BORDER_MIN,
      ringBorderMax: PADDED_RING_BORDER_MAX,
      petalWidthMin: PADDED_PETAL_WIDTH_MIN,
      petalWidthMax: PADDED_PETAL_WIDTH_MAX,
      ringRotationMin: PADDED_RING_ROTATION_MIN,
      ringRotationMax: PADDED_RING_ROTATION_MAX,
      ringBorderDeviation: PADDED_RING_BORDER_DEVIATION,
      petalWidthDeviation: PADDED_PETAL_WIDTH_DEVIATION,
      roseSeed: idx,
      coefficient,
      iTime: clock.value / 1000,
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
