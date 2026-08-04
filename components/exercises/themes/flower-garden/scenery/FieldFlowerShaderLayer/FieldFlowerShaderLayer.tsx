import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  ImageShader,
  Rect,
  Shader,
  Skia,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { useExerciseClockQuantized } from '../../../../core';
import type { FieldFlowerConfig, FieldFlowerType } from './types';
import { COVERING_SIZE } from './types';
import {
  chunkFieldFlowerConfigs,
  createFieldFlowerBatchUniforms,
  fillFieldFlowerBatchUniforms,
  type FieldFlowerBatch,
  type FieldFlowerSwingFrame,
} from './fieldFlowerBatch';
import { DANDELION_SKSL } from '../../shaders/dandelion.sksl';
import { CHAMOMILE_SKSL } from '../../shaders/chamomile.sksl';
import { POPPY_SKSL } from '../../shaders/poppy.sksl';
import { WILD_VIOLET_SKSL } from '../../shaders/wild_violet.sksl';

function compileFlowerEffect(sksl: string, label: string): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(sksl);
  if (!effect) {
    throw new Error(`Failed to compile ${label} shader`);
  }
  return effect;
}

const flowerEffects: Record<FieldFlowerType, SkRuntimeEffect> = {
  dandelion: compileFlowerEffect(DANDELION_SKSL, 'dandelion'),
  chamomile: compileFlowerEffect(CHAMOMILE_SKSL, 'chamomile'),
  poppy: compileFlowerEffect(POPPY_SKSL, 'poppy'),
  wild_violet: compileFlowerEffect(WILD_VIOLET_SKSL, 'wild_violet'),
};

const FLOWER_RECT_MARGIN = 20;

function computeFlowerRect(
  config: FieldFlowerConfig,
  margin: number,
): { x: number; y: number; w: number; h: number } {
  const sg = 1.05;
  const swingMargin = Math.abs(config.swingAmplitude) + 5;
  const totalMargin = margin + swingMargin;
  const lx = config.headerX;
  const ly = config.headerY;
  const fx = config.headerX + config.offsetX;
  const fy = config.headerY + config.offsetY;
  const leafR = config.leafLengths.length > 0 ? Math.max(...config.leafLengths) : 0;
  const flowerR = config.flowerSize * config.offsetScale * 0.5;
  const slx = config.headerX + config.clusterShadowOffsetX;
  const sly = config.headerY + config.clusterShadowOffsetY;
  const sfx = config.headerX + config.offsetX + config.flowerTopShadowOffsetX;
  const sfy = config.headerY + config.offsetY + config.flowerTopShadowOffsetY;
  const sflowerR = config.flowerSize * config.offsetScale * sg * 0.5;

  const minX = Math.min(lx - leafR, fx - flowerR, slx - leafR, sfx - sflowerR) - totalMargin;
  const maxX = Math.max(lx + leafR, fx + flowerR, slx + leafR, sfx + sflowerR) + totalMargin;
  const minY = Math.min(ly - leafR, fy - flowerR, sly - leafR, sfy - sflowerR) - totalMargin;
  const maxY = Math.max(ly + leafR, fy + flowerR, sly + leafR, sfy + sflowerR) + totalMargin;

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

function computeFlowerBatchRect(
  configs: readonly FieldFlowerConfig[],
  margin: number,
): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const config of configs) {
    const rect = computeFlowerRect(config, margin);
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  }
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

type FieldFlowerBatchRectProps = {
  batch: FieldFlowerBatch;
  stemImages: readonly SkImage[];
  leafImages: readonly SkImage[];
  flowerImages: readonly SkImage[];
  clock: ReturnType<typeof useExerciseClockQuantized>;
  flowerSwingBoosts: SharedValue<number[]> | undefined;
};

function FieldFlowerBatchRect({
  batch,
  stemImages,
  leafImages,
  flowerImages,
  clock,
  flowerSwingBoosts,
}: FieldFlowerBatchRectProps) {
  const { stemW, leafW, flowerW } = useMemo(() => {
    const stemImgW = stemImages.length >= 4 ? 1 : 0;
    const leafImgW = leafImages.length >= 4 ? 1 : 0;
    const flowerImgW = flowerImages.length >= 4 ? 1 : 0;
    return { stemW: stemImgW, leafW: leafImgW, flowerW: flowerImgW };
  }, [stemImages, leafImages, flowerImages]);

  const paddedUniforms = useMemo(() => createFieldFlowerBatchUniforms(), []);
  const batchConfigs = batch.configs;

  const uniforms = useDerivedValue(() => {
    const frame: FieldFlowerSwingFrame = {
      iTime: clock.value / 1000,
      boosts: flowerSwingBoosts?.value,
    };
    fillFieldFlowerBatchUniforms(paddedUniforms, batchConfigs, frame);
    return { ...paddedUniforms };
  });

  const flowerRect = useMemo(
    () => computeFlowerBatchRect(batchConfigs, FLOWER_RECT_MARGIN),
    [batchConfigs],
  );

  const effect = flowerEffects[batch.flowerType];

  const readyStemImages = useMemo(
    () => (stemImages.length >= 4 ? stemImages.slice(0, 4) : null),
    [stemImages],
  );

  const readyLeafImages = useMemo(
    () => (leafImages.length >= 4 ? leafImages.slice(0, 4) : null),
    [leafImages],
  );

  const readyFlowerImages = useMemo(
    () => (flowerImages.length >= 4 ? flowerImages.slice(0, 4) : null),
    [flowerImages],
  );

  if (stemW === 0 || leafW === 0 || flowerW === 0) return null;
  if (readyStemImages == null || readyLeafImages == null || readyFlowerImages == null) return null;

  return (
    <Rect
      x={flowerRect.x}
      y={flowerRect.y}
      width={flowerRect.w}
      height={flowerRect.h}
    >
      <Shader source={effect} uniforms={uniforms}>
        {readyStemImages.map((img, i) => (
          <ImageShader
            key={`stem-${i}`}
            image={img}
            x={0}
            y={0}
            width={COVERING_SIZE}
            height={COVERING_SIZE}
            fit="fill"
            tx="clamp"
            ty="clamp"
          />
        ))}
        {readyLeafImages.map((img, i) => (
          <ImageShader
            key={`leaf-${i}`}
            image={img}
            x={0}
            y={0}
            width={COVERING_SIZE}
            height={COVERING_SIZE}
            fit="fill"
            tx="clamp"
            ty="clamp"
          />
        ))}
        {readyFlowerImages.map((img, i) => (
          <ImageShader
            key={`flower-${i}`}
            image={img}
            x={0}
            y={0}
            width={COVERING_SIZE}
            height={COVERING_SIZE}
            fit="fill"
            tx="clamp"
            ty="clamp"
          />
        ))}
      </Shader>
    </Rect>
  );
}

export type FieldFlowerShaderLayerProps = {
  configs: readonly FieldFlowerConfig[];
  flowerSwingBoosts: SharedValue<number[]> | undefined;
  dandelionStemImages: readonly SkImage[];
  dandelionLeafImages: readonly SkImage[];
  dandelionFlowerImages: readonly SkImage[];
  chamomileStemImages: readonly SkImage[];
  chamomileLeafImages: readonly SkImage[];
  chamomileFlowerImages: readonly SkImage[];
  poppyStemImages: readonly SkImage[];
  poppyLeafImages: readonly SkImage[];
  poppyFlowerImages: readonly SkImage[];
  wildVioletStemImages: readonly SkImage[];
  wildVioletLeafImages: readonly SkImage[];
  wildVioletFlowerImages: readonly SkImage[];
};

type FlowerImageSet = {
  stemImages: readonly SkImage[];
  leafImages: readonly SkImage[];
  flowerImages: readonly SkImage[];
};

function FieldFlowerShaderLayerImpl({
  configs,
  flowerSwingBoosts,
  dandelionStemImages,
  dandelionLeafImages,
  dandelionFlowerImages,
  chamomileStemImages,
  chamomileLeafImages,
  chamomileFlowerImages,
  poppyStemImages,
  poppyLeafImages,
  poppyFlowerImages,
  wildVioletStemImages,
  wildVioletLeafImages,
  wildVioletFlowerImages,
}: FieldFlowerShaderLayerProps) {
  const { width, height } = useWindowDimensions();
  const clock = useExerciseClockQuantized(20);

  const batches = useMemo(() => chunkFieldFlowerConfigs(configs), [configs]);

  const imageSets: Record<FieldFlowerType, FlowerImageSet> = useMemo(
    () => ({
      dandelion: {
        stemImages: dandelionStemImages,
        leafImages: dandelionLeafImages,
        flowerImages: dandelionFlowerImages,
      },
      chamomile: {
        stemImages: chamomileStemImages,
        leafImages: chamomileLeafImages,
        flowerImages: chamomileFlowerImages,
      },
      poppy: {
        stemImages: poppyStemImages,
        leafImages: poppyLeafImages,
        flowerImages: poppyFlowerImages,
      },
      wild_violet: {
        stemImages: wildVioletStemImages,
        leafImages: wildVioletLeafImages,
        flowerImages: wildVioletFlowerImages,
      },
    }),
    [
      dandelionStemImages,
      dandelionLeafImages,
      dandelionFlowerImages,
      chamomileStemImages,
      chamomileLeafImages,
      chamomileFlowerImages,
      poppyStemImages,
      poppyLeafImages,
      poppyFlowerImages,
      wildVioletStemImages,
      wildVioletLeafImages,
      wildVioletFlowerImages,
    ],
  );

  if (width === 0 || height === 0) return null;
  if (batches.length === 0) return null;

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      {batches.map((batch, batchIndex) => {
        const set = imageSets[batch.flowerType];
        return (
          <FieldFlowerBatchRect
            key={`${batch.flowerType}-${batchIndex}`}
            batch={batch}
            stemImages={set.stemImages}
            leafImages={set.leafImages}
            flowerImages={set.flowerImages}
            clock={clock}
            flowerSwingBoosts={flowerSwingBoosts}
          />
        );
      })}
    </Canvas>
  );
}

export const FieldFlowerShaderLayer = React.memo(FieldFlowerShaderLayerImpl);

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
