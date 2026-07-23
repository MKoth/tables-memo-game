import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Fill,
  Group,
  ImageShader,
  Rect,
  Shader,
  Skia,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import {
  GRASS_HOLE_MASK_SKSL,
  type GrassHoleMaskConfig,
} from '../shaders/grassHoleMask.sksl';

function compileGrassHoleMaskEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(GRASS_HOLE_MASK_SKSL);
  if (!effect) {
    throw new Error('Failed to compile grass hole mask shader');
  }
  return effect;
}

const grassHoleMaskEffect = compileGrassHoleMaskEffect();

type FlowerGardenGrassCanvasProps = {
  image: SkImage;
  width: number;
  height: number;
  scale?: number;
  maskConfig: GrassHoleMaskConfig;
};

export function FlowerGardenGrassCanvas({
  image,
  width,
  height,
  scale = 1,
  maskConfig,
}: FlowerGardenGrassCanvasProps) {
  const uniforms = useMemo(() => {
    const cx = (maskConfig.centerX ?? 0.5) * width;
    const cy = (maskConfig.centerY ?? 0.35) * height;
    const rX = (maskConfig.minDiameter ?? 480) * 0.5;
    const rY = (maskConfig.maxDiameter ?? 360) * 0.5;

    return {
      center: [cx, cy],
      radius: [rX, rY],
      waveAmplitude: maskConfig.waveAmplitude ?? 0.15,
      waveFrequency:
        (2 * Math.PI) / (maskConfig.waveLength ?? 60),
      noiseAmount: maskConfig.noiseAmount ?? 0,
      noiseScale: maskConfig.noiseScale ?? 0.05,
      resolutionScale: 1.0,
    };
  }, [maskConfig, width, height]);

  if (width === 0 || height === 0) {
    return null;
  }

  const imageTransform =
    scale !== 1
      ? [{ scaleX: 1 / scale }, { scaleY: 1 / scale }]
      : undefined;

  return (
    <Canvas style={[styles.canvas, { width, height }]}>
      <Fill>
        <ImageShader
          image={image}
          tx="repeat"
          ty="repeat"
          fit="none"
          width={width}
          height={height}
          transform={imageTransform}
        />
      </Fill>
      <Group blendMode="dstOut">
        <Rect x={0} y={0} width={width} height={height}>
          <Shader source={grassHoleMaskEffect} uniforms={uniforms} />
        </Rect>
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
