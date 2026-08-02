import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  ImageShader,
  Rect,
  Shader,
  Skia,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import type { GroundScatterConfig } from './types';
import { MAX_GROUND_SPRITE_VARIANTS } from './types';
import {
  GROUND_SCATTER_COVERING_SIZE,
  GROUND_SCATTER_SKSL,
} from './groundScatter.sksl';

function compileGroundScatterEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(GROUND_SCATTER_SKSL);
  if (!effect) {
    throw new Error('Failed to compile ground scatter shader');
  }
  return effect;
}

const groundScatterEffect = compileGroundScatterEffect();

function padImages(images: readonly SkImage[]): SkImage[] {
  const out: SkImage[] = [];
  for (let i = 0; i < MAX_GROUND_SPRITE_VARIANTS; i++) {
    out.push(images[i % images.length]!);
  }
  return out;
}

type GroundScatterRectProps = {
  config: GroundScatterConfig;
  images: readonly SkImage[];
};

function GroundScatterRect({ config, images }: GroundScatterRectProps) {
  const uniforms = useMemo(
    () => ({
      center: [config.x, config.y],
      size: [config.size, config.size],
      rotation: config.rotation,
      variant: config.variant,
      opacity: config.opacity,
      brightness: config.brightness,
      tintA: config.tint ?? [1, 1, 1],
      tintStrength: config.tintStrength,
      shadowOffsetX: config.shadowOffsetX,
      shadowOffsetY: config.shadowOffsetY,
      shadowScale: config.shadowScale,
      shadowOpacity: config.shadowOpacity,
      shadowColor: config.shadowColor,
    }),
    [config],
  );

  const halfSize = config.size * 0.5;

  return (
    <Rect x={config.x - halfSize} y={config.y - halfSize} width={config.size} height={config.size}>
      <Shader source={groundScatterEffect} uniforms={uniforms}>
        {images.map((img, i) => (
          <ImageShader
            key={`sprite-${i}`}
            image={img}
            x={0}
            y={0}
            width={GROUND_SCATTER_COVERING_SIZE}
            height={GROUND_SCATTER_COVERING_SIZE}
            fit="fill"
            tx="clamp"
            ty="clamp"
          />
        ))}
      </Shader>
    </Rect>
  );
}

export type GroundScatterShaderLayerProps = {
  configs: readonly GroundScatterConfig[];
  images: readonly SkImage[];
};

function GroundScatterShaderLayerImpl({
  configs,
  images,
}: GroundScatterShaderLayerProps) {
  const paddedImages = useMemo(
    () => (images.length > 0 ? padImages(images) : null),
    [images],
  );

  if (configs.length === 0 || paddedImages == null) {
    return null;
  }

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      {configs.map(config => (
        <GroundScatterRect key={config.spriteId} config={config} images={paddedImages} />
      ))}
    </Canvas>
  );
}

export const GroundScatterShaderLayer = React.memo(GroundScatterShaderLayerImpl);

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
