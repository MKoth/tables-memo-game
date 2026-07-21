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
  type Uniforms,
} from '@shopify/react-native-skia';
import type { BushConfig } from './types';
import {
  MAX_LEAVES_PER_STEM,
  MAX_STEMS_PER_BUSH,
} from './types';
import {
  COVERING_SIZE,
  ROSE_BUSH_SKSL,
  roseBushUniformDefaults,
} from '../../shaders/roseBush.sksl';

function compileRoseBushEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(ROSE_BUSH_SKSL);
  if (!effect) {
    throw new Error('Failed to compile rose bush shader');
  }
  return effect;
}

const roseBushEffect = compileRoseBushEffect();

const LEAF_SLOTS = MAX_STEMS_PER_BUSH * MAX_LEAVES_PER_STEM;

function padArray(arr: readonly number[], target: number, fill = 0): number[] {
  return [
    ...arr,
    ...Array(Math.max(0, target - arr.length)).fill(fill),
  ];
}

function pickBushUniforms(
  bush: BushConfig,
  roseBellSizes: readonly number[],
): Uniforms {
  const stemBaseX: number[] = [];
  const stemBaseY: number[] = [];
  const stemTopX: number[] = [];
  const stemTopY: number[] = [];
  const stemControlX: number[] = [];
  const stemControlY: number[] = [];
  const stemBaseWidth: number[] = [];
  const stemTopWidth: number[] = [];
  const stemCalyxSize: number[] = [];
  const stemLeafCount: number[] = [];
  const leafT: number[] = [];
  const leafSide: number[] = [];
  const leafTilt: number[] = [];
  const leafVariant: number[] = [];
  const leafSize: number[] = [];

  for (const stem of bush.stems) {
    stemBaseX.push(stem.baseX);
    stemBaseY.push(stem.baseY);
    stemTopX.push(stem.topX);
    stemTopY.push(stem.topY);
    stemControlX.push(stem.controlX);
    stemControlY.push(stem.controlY);
    stemBaseWidth.push(stem.baseWidth);
    stemTopWidth.push(stem.topWidth);
    const bellSize = roseBellSizes[stem.roseIndex] ?? 0;
    stemCalyxSize.push(bellSize * roseBushUniformDefaults.calyxSizeFraction);
    stemLeafCount.push(stem.leaves.length);
    for (const leaf of stem.leaves) {
      leafT.push(leaf.t);
      leafSide.push(leaf.side);
      leafTilt.push(leaf.tilt);
      leafVariant.push(leaf.variant);
      leafSize.push(leaf.size);
    }
  }

  return {
    stemCount: bush.stems.length,
    stemBaseX: padArray(stemBaseX, MAX_STEMS_PER_BUSH),
    stemBaseY: padArray(stemBaseY, MAX_STEMS_PER_BUSH),
    stemTopX: padArray(stemTopX, MAX_STEMS_PER_BUSH),
    stemTopY: padArray(stemTopY, MAX_STEMS_PER_BUSH),
    stemControlX: padArray(stemControlX, MAX_STEMS_PER_BUSH),
    stemControlY: padArray(stemControlY, MAX_STEMS_PER_BUSH),
    stemBaseWidth: padArray(stemBaseWidth, MAX_STEMS_PER_BUSH),
    stemTopWidth: padArray(stemTopWidth, MAX_STEMS_PER_BUSH),
    stemCalyxSize: padArray(stemCalyxSize, MAX_STEMS_PER_BUSH),
    stemLeafCount: padArray(stemLeafCount, MAX_STEMS_PER_BUSH),
    leafT: padArray(leafT, LEAF_SLOTS),
    leafSide: padArray(leafSide, LEAF_SLOTS),
    leafTilt: padArray(leafTilt, LEAF_SLOTS),
    leafVariant: padArray(leafVariant, LEAF_SLOTS),
    leafSize: padArray(leafSize, LEAF_SLOTS),
  };
}

export type BushShaderLayerProps = {
  bushConfigs: readonly BushConfig[];
  roseBellSizes: readonly number[];
  stemImage: SkImage;
  calyxImage: SkImage;
  leafImages: readonly SkImage[];
};

function BushShaderLayerImpl({
  bushConfigs,
  roseBellSizes,
  stemImage,
  calyxImage,
  leafImages,
}: BushShaderLayerProps) {
  const { width, height } = useWindowDimensions();

  const readyLeafImages = useMemo(
    () => (leafImages.length >= 4 ? leafImages.slice(0, 4) : null),
    [leafImages],
  );

  const uniformsList = useMemo(
    () => bushConfigs.map(bush => pickBushUniforms(bush, roseBellSizes)),
    [bushConfigs, roseBellSizes],
  );

  if (width === 0 || height === 0) return null;
  if (readyLeafImages == null) return null;
  if (bushConfigs.length === 0) return null;

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      {bushConfigs.map((bush, index) => {
        const uniforms = uniformsList[index];
        if (uniforms == null) return null;
        return (
          <Rect
            key={bush.bushId}
            x={0}
            y={0}
            width={width}
            height={height}>
            <Shader source={roseBushEffect} uniforms={uniforms}>
              <ImageShader
                image={stemImage}
                x={0}
                y={0}
                width={COVERING_SIZE}
                height={COVERING_SIZE}
                fit="fill"
                tx="clamp"
                ty="clamp"
              />
              <ImageShader
                image={calyxImage}
                x={0}
                y={0}
                width={COVERING_SIZE}
                height={COVERING_SIZE}
                fit="fill"
                tx="clamp"
                ty="clamp"
              />
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
            </Shader>
          </Rect>
        );
      })}
    </Canvas>
  );
}

export const BushShaderLayer = React.memo(BushShaderLayerImpl);

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
