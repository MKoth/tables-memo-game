import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Rect, Shader } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import type { RoamerRuntimeEntry } from '../core/types';
import { createEmptyParticlePool } from './updateParticlePool';
import { useParticleFrameLoop } from './useParticleFrameLoop';
import { particleDustEffect } from './particleDust.sksl';
import { DUST_RECT_HALF_EXTENT } from './particleBounds';
import { DEFAULT_PARTICLE_CONFIG, type ParticleInternal } from './particleTypes';
import { MAX_PARTICLES } from './particleConfig';

export type FlowerGardenParticleLayerProps = {
  runtimeEntries: RoamerRuntimeEntry[];
  width: number;
  height: number;
};

type DustUniforms = {
  iResolution: [number, number];
  uActiveCount: number;
  uParticleData: number[];
  uParticleColor: number[];
};

function buildUniforms(
  pool: ParticleInternal[],
  width: number,
  height: number,
): DustUniforms {
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

type DustRectProps = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  alive: SharedValue<number[]>;
  index: number;
  halfExtent: number;
  uniforms: SharedValue<DustUniforms>;
};

function DustRectImpl({ x, y, alive, index, halfExtent, uniforms }: DustRectProps) {
  const rectX = useDerivedValue(() => {
    if (alive.value[index] !== 1) return 0;
    return x.value - halfExtent;
  });
  const rectY = useDerivedValue(() => {
    if (alive.value[index] !== 1) return 0;
    return y.value - halfExtent;
  });
  const rectSize = useDerivedValue(() => {
    if (alive.value[index] !== 1) return 0;
    return halfExtent * 2;
  });

  return (
    <Rect x={rectX} y={rectY} width={rectSize} height={rectSize}>
      <Shader source={particleDustEffect} uniforms={uniforms} />
    </Rect>
  );
}

const DustRect = React.memo(DustRectImpl);

export function FlowerGardenParticleLayer({
  runtimeEntries,
  width,
  height,
}: FlowerGardenParticleLayerProps) {
  const pool = useSharedValue<ParticleInternal[]>(createEmptyParticlePool());
  const lastEmitTimestamps = useSharedValue<number[]>([]);
  const rectAlive = useSharedValue<number[]>(Array(runtimeEntries.length).fill(0));

  useParticleFrameLoop(
    runtimeEntries,
    pool,
    lastEmitTimestamps,
    rectAlive,
    DEFAULT_PARTICLE_CONFIG,
  );

  const particleUniforms = useDerivedValue(() => {
    return buildUniforms(pool.value, width, height);
  });

  const halfExtents = useMemo(
    () => runtimeEntries.map(entry => DUST_RECT_HALF_EXTENT[entry.spawn.species]),
    [runtimeEntries],
  );

  if (width <= 0 || height <= 0) return null;

  return (
    <View pointerEvents="none" style={styles.wrapper}>
      <Canvas style={styles.canvas}>
        {runtimeEntries.map(({ runtime }, index) => (
          <DustRect
            key={index}
            x={runtime.x}
            y={runtime.y}
            alive={rectAlive}
            index={index}
            halfExtent={halfExtents[index]!}
            uniforms={particleUniforms}
          />
        ))}
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
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
