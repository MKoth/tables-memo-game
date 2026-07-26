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
import { useDerivedValue } from 'react-native-reanimated';
import { useExerciseClockQuantized } from '../../../../core';
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

type FieldFlowerRectProps = {
  config: FieldFlowerConfig;
  stemImages: readonly SkImage[];
  leafImages: readonly SkImage[];
  flowerImages: readonly SkImage[];
  clock: ReturnType<typeof useExerciseClockQuantized>;
};

function FieldFlowerRect({
  config,
  stemImages,
  leafImages,
  flowerImages,
  clock,
}: FieldFlowerRectProps) {
  const { stemW, leafW, flowerW } = useMemo(() => {
    const stemImgW = stemImages.length >= 4 ? 1 : 0;
    const leafImgW = leafImages.length >= 4 ? 1 : 0;
    const flowerImgW = flowerImages.length >= 4 ? 1 : 0;
    return { stemW: stemImgW, leafW: leafImgW, flowerW: flowerImgW };
  }, [stemImages, leafImages, flowerImages]);

  const uniforms = useDerivedValue(() => {
    const iTime = clock.value / 1000;
    const swing =
      Math.sin(iTime * config.swingSpeed + config.swingPhase) *
      config.swingAmplitude;
    const cosA = Math.cos(config.swingAngle);
    const sinA = Math.sin(config.swingAngle);
    const swingX = swing * cosA;
    const swingY = swing * sinA;
    const leafSwingX = swingX * 0.4;
    const leafSwingY = swingY * 0.4;

    const n = MAX_FIELD_FLOWERS;
    const leafVariant: number[] = [];
    const leafLength: number[] = [];
    const leafWidth: number[] = [];
    for (let j = 0; j < config.leafVariants.length; j++) {
      leafVariant.push(config.leafVariants[j] ?? 0);
      leafLength.push(config.leafLengths[j] ?? 0);
      leafWidth.push(config.leafWidths[j] ?? 0);
    }
    const padLen = MAX_LEAVES_PER_FLOWER * n;

    function pad(arr: readonly number[], target: number): number[] {
      const len = Math.min(arr.length, target);
      const out: number[] = [];
      for (let i = 0; i < len; i++) out.push(arr[i] ?? 0);
      for (let i = len; i < target; i++) out.push(0);
      return out;
    }

    return {
      dandelionCount: 1,
      headerX: pad([config.headerX], n),
      headerY: pad([config.headerY], n),
      offsetX: pad([config.offsetX + swingX], n),
      offsetY: pad([config.offsetY + swingY], n),
      offsetScale: pad([config.offsetScale], n),
      stemBaseX: pad([config.stemBaseX], n),
      stemBaseY: pad([config.stemBaseY], n),
      stemBaseWidth: pad([config.stemBaseWidth], n),
      stemTopWidth: pad([config.stemTopWidth], n),
      stemVariant: pad([config.stemVariant], n),
      flowerVariant: pad([config.flowerVariant], n),
      leafCount: pad([config.leafCount], n),
      leafVariant: pad(leafVariant, padLen),
      perLeafLength: pad(leafLength, padLen),
      perLeafWidth: pad(leafWidth, padLen),
      flowerSize: pad([config.flowerSize], n),
      ringRotation: pad([config.ringRotation], n),
      clusterShadowOffsetX: pad([config.clusterShadowOffsetX + leafSwingX], n),
      clusterShadowOffsetY: pad([config.clusterShadowOffsetY + leafSwingY], n),
      flowerTopShadowOffsetX: pad([config.flowerTopShadowOffsetX], n),
      flowerTopShadowOffsetY: pad([config.flowerTopShadowOffsetY], n),
    };
  });

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
  const clock = useExerciseClockQuantized(20);

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
            clock={clock}
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
