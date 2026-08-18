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
import type { ScatterConfig } from './types';
import { MAX_SCATTER_VARIANTS } from './types';
import { SCATTER_COVERING_SIZE, SCATTER_SKSL } from './scatterShader.sksl';

function compileScatterEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(SCATTER_SKSL);
  if (!effect) {
    throw new Error('Failed to compile scatter shader');
  }
  return effect;
}

const scatterEffect = compileScatterEffect();

function padImages(images: readonly SkImage[]): SkImage[] {
  const out: SkImage[] = [];
  for (let i = 0; i < MAX_SCATTER_VARIANTS; i++) {
    out.push(images[i % images.length]!);
  }
  return out;
}

type ScatterRectProps = {
  config: ScatterConfig;
  images: readonly SkImage[];
};

function ScatterRect({ config, images }: ScatterRectProps) {
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
      <Shader source={scatterEffect} uniforms={uniforms}>
        {images.map((img, i) => (
          <ImageShader
            key={`sprite-${i}`}
            image={img}
            x={0}
            y={0}
            width={SCATTER_COVERING_SIZE}
            height={SCATTER_COVERING_SIZE}
            fit="fill"
            tx="clamp"
            ty="clamp"
          />
        ))}
      </Shader>
    </Rect>
  );
}

export type ScatterGroup = {
  configs: readonly ScatterConfig[];
  images: readonly SkImage[];
};

type ScatterLayerProps = {
  groups: readonly ScatterGroup[];
};

function ScatterLayerImpl({ groups }: ScatterLayerProps) {
  const paddedGroups = useMemo(
    () =>
      groups.map(g => ({
        images: g.images.length > 0 ? padImages(g.images) : null,
        configs: g.configs,
      })),
    [groups],
  );

  const hasContent = paddedGroups.some(
    g => g.images != null && g.configs.length > 0,
  );
  if (!hasContent) {
    return null;
  }

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      {paddedGroups.map(group =>
        group.images != null
          ? group.configs.map(config => (
              <ScatterRect
                key={config.spriteId}
                config={config}
                images={group.images!}
              />
            ))
          : null,
      )}
    </Canvas>
  );
}

export const SwampScatterLayer = React.memo(ScatterLayerImpl);

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
