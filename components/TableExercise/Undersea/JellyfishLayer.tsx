import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { JellyfishInstance, JellyfishShadowInstance } from './JellyfishInstance';

/** Number of jellyfish in the scene. */
export const JELLYFISH_COUNT = 10;

/** px — shadow offset from jellyfish center (light from above-left). */
const SHADOW_OFFSET_X = 40;
const SHADOW_OFFSET_Y = 90;
const SHADOW_COLOR = [0.02, 0.06, 0.12] as const;
const SHADOW_OPACITY = 0.15;
const SHADOW_SOFTNESS = 0.45;

/** Per-instance random ranges at spawn. Tilt params are not randomized — they stay 0. */
export const JELLYFISH_SPAWN_RANGES = {
  xRatio: { min: 0.15, max: 0.85 },
  yRatio: { min: 0.20, max: 0.70 },
  bellSize: { min: 70, max: 110 },
  pulseSpeed: { min: 2.0, max: 4.0 },
} as const;

type JellyfishSpawn = {
  xRatio: number;
  yRatio: number;
  bellSize: number;
  phase: number;
  pulseSpeed: number;
};

function randomInRange({ min, max }: { min: number; max: number }): number {
  return min + Math.random() * (max - min);
}

function createRandomSpawns(count: number): JellyfishSpawn[] {
  return Array.from({ length: count }, () => ({
    xRatio: randomInRange(JELLYFISH_SPAWN_RANGES.xRatio),
    yRatio: randomInRange(JELLYFISH_SPAWN_RANGES.yRatio),
    bellSize: randomInRange(JELLYFISH_SPAWN_RANGES.bellSize),
    phase: Math.random() * Math.PI * 2,
    pulseSpeed: randomInRange(JELLYFISH_SPAWN_RANGES.pulseSpeed),
  }));
}

export type JellyfishLayerProps = {
  width: number;
  height: number;
  bellImage: SkImage;
  tentacleImage: SkImage;
  clock: SharedValue<number>;
  jellyfishCount?: number;
};

export function JellyfishLayer({
  width,
  height,
  bellImage,
  tentacleImage,
  clock,
  jellyfishCount = JELLYFISH_COUNT,
}: JellyfishLayerProps) {
  const spawns = useMemo(
    () => createRandomSpawns(jellyfishCount),
    [jellyfishCount, width, height],
  );

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Group>
        {spawns.map((spawn, index) => (
          <JellyfishShadowInstance
            key={`jellyfish-shadow-${index}`}
            bellImage={bellImage}
            tentacleImage={tentacleImage}
            centerX={spawn.xRatio * width}
            centerY={spawn.yRatio * height}
            bellSize={spawn.bellSize}
            phase={spawn.phase}
            pulseSpeed={spawn.pulseSpeed}
            clock={clock}
            offsetX={SHADOW_OFFSET_X}
            offsetY={SHADOW_OFFSET_Y}
            shadowColor={SHADOW_COLOR}
            shadowOpacity={SHADOW_OPACITY}
            shadowSoftness={SHADOW_SOFTNESS}
          />
        ))}
      </Group>
      <Group>
        {spawns.map((spawn, index) => (
          <JellyfishInstance
            key={`jellyfish-${index}`}
            bellImage={bellImage}
            tentacleImage={tentacleImage}
            centerX={spawn.xRatio * width}
            centerY={spawn.yRatio * height}
            bellSize={spawn.bellSize}
            phase={spawn.phase}
            pulseSpeed={spawn.pulseSpeed}
            clock={clock}
          />
        ))}
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
