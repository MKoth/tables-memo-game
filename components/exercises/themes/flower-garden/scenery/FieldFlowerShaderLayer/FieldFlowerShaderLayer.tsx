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
import type { FieldFlowerConfig, FieldFlowerType } from './types';
import { MAX_FIELD_FLOWERS, MAX_LEAVES_PER_FLOWER, COVERING_SIZE } from './types';
import { DANDELION_SKSL } from '../../shaders/dandelion.sksl';
import { CHAMOMILE_SKSL } from '../../shaders/chamomile.sksl';
import { POPPY_SKSL } from '../../shaders/poppy.sksl';
import { WILD_VIOLET_SKSL } from '../../shaders/wild_violet.sksl';

type FlowerShaderMap = Record<FieldFlowerType, string>;

const FLOWER_SKSL: FlowerShaderMap = {
  dandelion: DANDELION_SKSL,
  chamomile: CHAMOMILE_SKSL,
  poppy: POPPY_SKSL,
  wild_violet: WILD_VIOLET_SKSL,
};

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

function padArray(arr: readonly number[], target: number, fill = 0): number[] {
  const len = Math.min(arr.length, target);
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    out.push(arr[i] ?? fill);
  }
  for (let i = len; i < target; i++) {
    out.push(fill);
  }
  return out;
}

function computeFlowerRect(
  config: FieldFlowerConfig,
  margin: number,
): { x: number; y: number; w: number; h: number } {
  const sg = 1.05;
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

  const minX = Math.min(lx - leafR, fx - flowerR, slx - leafR, sfx - sflowerR) - margin;
  const maxX = Math.max(lx + leafR, fx + flowerR, slx + leafR, sfx + sflowerR) + margin;
  const minY = Math.min(ly - leafR, fy - flowerR, sly - leafR, sfy - sflowerR) - margin;
  const maxY = Math.max(ly + leafR, fy + flowerR, sly + leafR, sfy + sflowerR) + margin;

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

function pickFlowerUniforms(
  config: FieldFlowerConfig,
): Record<string, number | number[]> {
  const leafVariantArray: number[] = [];
  const leafLengthArray: number[] = [];
  const leafWidthArray: number[] = [];
  for (let j = 0; j < config.leafVariants.length; j++) {
    leafVariantArray.push(config.leafVariants[j] ?? 0);
    leafLengthArray.push(config.leafLengths[j] ?? 0);
    leafWidthArray.push(config.leafWidths[j] ?? 0);
  }

  return {
    dandelionCount: 1,
    headerX: padArray([config.headerX], MAX_FIELD_FLOWERS),
    headerY: padArray([config.headerY], MAX_FIELD_FLOWERS),
    offsetX: padArray([config.offsetX], MAX_FIELD_FLOWERS),
    offsetY: padArray([config.offsetY], MAX_FIELD_FLOWERS),
    offsetScale: padArray([config.offsetScale], MAX_FIELD_FLOWERS),
    stemBaseX: padArray([config.stemBaseX], MAX_FIELD_FLOWERS),
    stemBaseY: padArray([config.stemBaseY], MAX_FIELD_FLOWERS),
    stemBaseWidth: padArray([config.stemBaseWidth], MAX_FIELD_FLOWERS),
    stemTopWidth: padArray([config.stemTopWidth], MAX_FIELD_FLOWERS),
    stemVariant: padArray([config.stemVariant], MAX_FIELD_FLOWERS),
    flowerVariant: padArray([config.flowerVariant], MAX_FIELD_FLOWERS),
    leafCount: padArray([config.leafCount], MAX_FIELD_FLOWERS),
    leafVariant: padArray(leafVariantArray, MAX_LEAVES_PER_FLOWER * MAX_FIELD_FLOWERS),
    perLeafLength: padArray(leafLengthArray, MAX_LEAVES_PER_FLOWER * MAX_FIELD_FLOWERS),
    perLeafWidth: padArray(leafWidthArray, MAX_LEAVES_PER_FLOWER * MAX_FIELD_FLOWERS),
    flowerSize: padArray([config.flowerSize], MAX_FIELD_FLOWERS),
    ringRotation: padArray([config.ringRotation], MAX_FIELD_FLOWERS),
    clusterShadowOffsetX: padArray([config.clusterShadowOffsetX], MAX_FIELD_FLOWERS),
    clusterShadowOffsetY: padArray([config.clusterShadowOffsetY], MAX_FIELD_FLOWERS),
    flowerTopShadowOffsetX: padArray([config.flowerTopShadowOffsetX], MAX_FIELD_FLOWERS),
    flowerTopShadowOffsetY: padArray([config.flowerTopShadowOffsetY], MAX_FIELD_FLOWERS),
  };
}

type FieldFlowerRectProps = {
  config: FieldFlowerConfig;
  stemImages: readonly SkImage[];
  leafImages: readonly SkImage[];
  flowerImages: readonly SkImage[];
};

function FieldFlowerRect({
  config,
  stemImages,
  leafImages,
  flowerImages,
}: FieldFlowerRectProps) {
  const { stemW, leafW, flowerW } = useMemo(() => {
    const stemImgW = stemImages.length >= 4 ? 1 : 0;
    const leafImgW = leafImages.length >= 4 ? 1 : 0;
    const flowerImgW = flowerImages.length >= 4 ? 1 : 0;
    return { stemW: stemImgW, leafW: leafImgW, flowerW: flowerImgW };
  }, [stemImages, leafImages, flowerImages]);

  const uniforms = useMemo(() => pickFlowerUniforms(config), [config]);

  const flowerRect = useMemo(
    () => computeFlowerRect(config, FLOWER_RECT_MARGIN),
    [config],
  );

  const effect = flowerEffects[config.flowerType];

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
  if (configs.length === 0) return null;

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      {configs.map(config => {
        const set = imageSets[config.flowerType];
        return (
          <FieldFlowerRect
            key={config.flowerId}
            config={config}
            stemImages={set.stemImages}
            leafImages={set.leafImages}
            flowerImages={set.flowerImages}
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
