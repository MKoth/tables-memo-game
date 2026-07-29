import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Rect, Shader } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import type { RoamerRuntimeEntry } from '../core/types';
import { createEmptyParticlePool } from './updateParticlePool';
import { useParticleFrameLoop } from './useParticleFrameLoop';
import { particleDustEffect } from './particleDust.sksl';
import { DEFAULT_PARTICLE_CONFIG, type ParticleInternal } from './particleTypes';
import { MAX_PARTICLES } from './particleConfig';

export type FlowerGardenParticleLayerProps = {
  runtimeEntries: RoamerRuntimeEntry[];
  width: number;
  height: number;
};

function buildUniforms(
  pool: ParticleInternal[],
  width: number,
  height: number,
): {
  iResolution: [number, number];
  uActiveCount: number;
  uParticleData: number[];
  uParticleColor: number[];
} {
  'worklet';
  let activeCount = 0;
  const posData: number[] = [];
  const colorData: number[] = [];

  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = pool[i]!;
    if (p.active) {
      posData.push(p.x, p.y, p.opacity, p.radius);
      colorData.push(p.r, p.g, p.b, 0);
      activeCount++;
    } else {
      posData.push(0, 0, 0, 0);
      colorData.push(0, 0, 0, 0);
    }
  }

  return {
    iResolution: [width, height],
    uActiveCount: activeCount,
    uParticleData: posData,
    uParticleColor: colorData,
  };
}

export function FlowerGardenParticleLayer({
  runtimeEntries,
  width,
  height,
}: FlowerGardenParticleLayerProps) {
  const pool = useSharedValue<ParticleInternal[]>(createEmptyParticlePool());
  const lastEmitTimestamps = useSharedValue<number[]>([]);

  useParticleFrameLoop(runtimeEntries, pool, lastEmitTimestamps, DEFAULT_PARTICLE_CONFIG);

  const particleUniforms = useDerivedValue(() => {
    return buildUniforms(pool.value, width, height);
  });

  if (width <= 0 || height <= 0) return null;

  return (
    <View pointerEvents="none" style={styles.wrapper}>
      <Canvas style={styles.canvas}>
        <Rect x={0} y={0} width={width} height={height}>
          <Shader source={particleDustEffect} uniforms={particleUniforms} />
        </Rect>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  canvas: {
    flex: 1,
  },
});
