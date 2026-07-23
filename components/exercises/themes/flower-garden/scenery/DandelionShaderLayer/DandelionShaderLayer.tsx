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
import type { DandelionConfig } from './types';
import { MAX_DANDELIONS, MAX_LEAVES_PER_DANDELION } from './types';
import {
  COVERING_SIZE,
  DANDELION_SKSL,
} from '../../shaders/dandelion.sksl';

function compileDandelionEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(DANDELION_SKSL);
  if (!effect) {
    throw new Error('Failed to compile dandelion shader');
  }
  return effect;
}

const dandelionEffect = compileDandelionEffect();

const DANDELION_RECT_MARGIN = 20;

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

function computeDandelionRect(
  config: DandelionConfig,
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

function pickDandelionUniforms(
  config: DandelionConfig,
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
    headerX: padArray([config.headerX], MAX_DANDELIONS),
    headerY: padArray([config.headerY], MAX_DANDELIONS),
    offsetX: padArray([config.offsetX], MAX_DANDELIONS),
    offsetY: padArray([config.offsetY], MAX_DANDELIONS),
    offsetScale: padArray([config.offsetScale], MAX_DANDELIONS),
    stemBaseX: padArray([config.stemBaseX], MAX_DANDELIONS),
    stemBaseY: padArray([config.stemBaseY], MAX_DANDELIONS),
    stemBaseWidth: padArray([config.stemBaseWidth], MAX_DANDELIONS),
    stemTopWidth: padArray([config.stemTopWidth], MAX_DANDELIONS),
    stemVariant: padArray([config.stemVariant], MAX_DANDELIONS),
    flowerVariant: padArray([config.flowerVariant], MAX_DANDELIONS),
    leafCount: padArray([config.leafCount], MAX_DANDELIONS),
    leafVariant: padArray(leafVariantArray, MAX_LEAVES_PER_DANDELION * MAX_DANDELIONS),
    perLeafLength: padArray(leafLengthArray, MAX_LEAVES_PER_DANDELION * MAX_DANDELIONS),
    perLeafWidth: padArray(leafWidthArray, MAX_LEAVES_PER_DANDELION * MAX_DANDELIONS),
    flowerSize: padArray([config.flowerSize], MAX_DANDELIONS),
    ringRotation: padArray([config.ringRotation], MAX_DANDELIONS),
    clusterShadowOffsetX: padArray([config.clusterShadowOffsetX], MAX_DANDELIONS),
    clusterShadowOffsetY: padArray([config.clusterShadowOffsetY], MAX_DANDELIONS),
    flowerTopShadowOffsetX: padArray([config.flowerTopShadowOffsetX], MAX_DANDELIONS),
    flowerTopShadowOffsetY: padArray([config.flowerTopShadowOffsetY], MAX_DANDELIONS),
  };
}

type DandelionShaderDandelionRectProps = {
  config: DandelionConfig;
  stemImages: readonly SkImage[];
  leafImages: readonly SkImage[];
  flowerImages: readonly SkImage[];
};

function DandelionShaderDandelionRect({
  config,
  stemImages,
  leafImages,
  flowerImages,
}: DandelionShaderDandelionRectProps) {
  const { stemW, leafW, flowerW } = useMemo(() => {
    const stemImgW = stemImages.length >= 4 ? 1 : 0;
    const leafImgW = leafImages.length >= 4 ? 1 : 0;
    const flowerImgW = flowerImages.length >= 4 ? 1 : 0;
    return { stemW: stemImgW, leafW: leafImgW, flowerW: flowerImgW };
  }, [stemImages, leafImages, flowerImages]);

  const uniforms = useMemo(() => pickDandelionUniforms(config), [config]);

  const dandelionRect = useMemo(
    () => computeDandelionRect(config, DANDELION_RECT_MARGIN),
    [config],
  );

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
      x={dandelionRect.x}
      y={dandelionRect.y}
      width={dandelionRect.w}
      height={dandelionRect.h}
    >
      <Shader source={dandelionEffect} uniforms={uniforms}>
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

export type DandelionShaderLayerProps = {
  configs: readonly DandelionConfig[];
  stemImages: readonly SkImage[];
  leafImages: readonly SkImage[];
  flowerImages: readonly SkImage[];
};

function DandelionShaderLayerImpl({
  configs,
  stemImages,
  leafImages,
  flowerImages,
}: DandelionShaderLayerProps) {
  const { width, height } = useWindowDimensions();

  if (width === 0 || height === 0) return null;
  if (configs.length === 0) return null;

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      {configs.map(config => (
        <DandelionShaderDandelionRect
          key={config.dandelionId}
          config={config}
          stemImages={stemImages}
          leafImages={leafImages}
          flowerImages={flowerImages}
        />
      ))}
    </Canvas>
  );
}

export const DandelionShaderLayer = React.memo(DandelionShaderLayerImpl);

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
