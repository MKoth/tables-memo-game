import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import {
  EARTH_GRASS_BACKGROUND_SKSL,
  type EarthGrassBackgroundConfig,
} from '../../shaders/earthGrassBackground.sksl';
import { buildEarthGrassBackgroundUniforms } from './buildEarthGrassBackgroundUniforms';

const BACKGROUND_RES = 0.85;

function compileEarthGrassBackgroundEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(EARTH_GRASS_BACKGROUND_SKSL);
  if (!effect) {
    throw new Error('Failed to compile earth/grass background shader');
  }
  return effect;
}

const earthGrassBackgroundEffect = compileEarthGrassBackgroundEffect();

type FlowerGardenBackgroundCanvasProps = {
  earthImage: SkImage;
  grassImage: SkImage;
  width: number;
  height: number;
  grassScale?: number;
  brightness?: number;
  maskConfig: EarthGrassBackgroundConfig;
};

export function FlowerGardenBackgroundCanvas({
  earthImage,
  grassImage,
  width,
  height,
  grassScale = 1,
  brightness = 1.5,
  maskConfig,
}: FlowerGardenBackgroundCanvasProps) {
  const bgWidth = Math.max(1, Math.round(width * BACKGROUND_RES));
  const bgHeight = Math.max(1, Math.round(height * BACKGROUND_RES));

  const uniforms = useMemo(
    () =>
      buildEarthGrassBackgroundUniforms(maskConfig, bgWidth, bgHeight, {
        grassScale,
        brightness,
      }),
    [maskConfig, bgWidth, bgHeight, grassScale, brightness],
  );

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <Canvas
      style={[
        styles.canvas,
        {
          width: bgWidth,
          height: bgHeight,
          transform: [{ scale: 1 / BACKGROUND_RES }],
        },
      ]}>
      <Fill>
        <Shader source={earthGrassBackgroundEffect} uniforms={uniforms}>
          <ImageShader
            image={earthImage}
            tx="repeat"
            ty="repeat"
            fit="none"
            width={bgWidth}
            height={bgHeight}
          />
          <ImageShader
            image={grassImage}
            tx="repeat"
            ty="repeat"
            fit="none"
            width={bgWidth}
            height={bgHeight}
          />
        </Shader>
      </Fill>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'top left',
  },
});
