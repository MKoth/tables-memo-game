import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { JellyfishInstance } from './JellyfishInstance';

/** Number of jellyfish in the scene. */
export const JELLYFISH_COUNT = 50;

/** Render resolution multiplier — lower = fewer fragment shader pixels. */
export const JELLYFISH_RES = 0.65;

/** Per-instance random ranges at spawn. Tilt params are not randomized — they stay 0. */
export const JELLYFISH_SPAWN_RANGES = {
  xRatio: { min: 0.15, max: 0.85 },
  yRatio: { min: 0.20, max: 0.70 },
  bellSize: { min: 70, max: 110 },
  pulseSpeed: { min: 2.0, max: 4.0 },
} as const;

/** Relative weights for uniform / dual / triple radial tint at spawn. */
export const JELLYFISH_TINT_MODE_WEIGHTS = [0.35, 0.35, 0.3] as const;

/** Jellyfish tint colors (RGB 0..1) picked randomly per instance at spawn. */
export const JELLYFISH_TINT_PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [0.85, 0.55, 0.95], // purple
  [0.55, 0.85, 1.0], // cyan
  [1.0, 0.7, 0.85], // pink
  [0.9, 0.95, 1.1], // pale blue
  [1.1, 0.85, 0.6], // warm gold
  [0.7, 0.95, 0.75], // sea green
  [1.15, 0.75, 0.9], // rose glow
  [0.6, 0.7, 1.15], // deep blue
];

type JellyfishTintMode = 0 | 1 | 2;

type JellyfishSpawn = {
  xRatio: number;
  yRatio: number;
  bellSize: number;
  phase: number;
  pulseSpeed: number;
  tintMode: JellyfishTintMode;
  tintStrength: number;
  tintA: readonly [number, number, number];
  tintB: readonly [number, number, number];
  tintC: readonly [number, number, number];
};

function randomInRange({ min, max }: { min: number; max: number }): number {
  return min + Math.random() * (max - min);
}

function rollTintMode(): JellyfishTintMode {
  const r = Math.random();
  const [uniform, dual] = JELLYFISH_TINT_MODE_WEIGHTS;
  if (r < uniform) {
    return 0;
  }
  if (r < uniform + dual) {
    return 1;
  }
  return 2;
}

function pickDistinctTintColors(
  count: number,
): ReadonlyArray<readonly [number, number, number]> {
  const pool = [...JELLYFISH_TINT_PALETTE];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function rollTintSpawn(): Pick<
  JellyfishSpawn,
  'tintMode' | 'tintStrength' | 'tintA' | 'tintB' | 'tintC'
> {
  const mode = rollTintMode();
  if (mode === 0) {
    const [a] = pickDistinctTintColors(1);
    return { tintMode: 0, tintA: a, tintB: a, tintC: a, tintStrength: 0.85 };
  }
  if (mode === 1) {
    const [a, b] = pickDistinctTintColors(2);
    return { tintMode: 1, tintA: a, tintB: b, tintC: b, tintStrength: 0.9 };
  }
  const [a, b, c] = pickDistinctTintColors(3);
  return { tintMode: 2, tintA: a, tintB: b, tintC: c, tintStrength: 0.9 };
}

function createRandomSpawns(count: number): JellyfishSpawn[] {
  return Array.from({ length: count }, () => ({
    xRatio: randomInRange(JELLYFISH_SPAWN_RANGES.xRatio),
    yRatio: randomInRange(JELLYFISH_SPAWN_RANGES.yRatio),
    bellSize: randomInRange(JELLYFISH_SPAWN_RANGES.bellSize),
    phase: Math.random() * Math.PI * 2,
    pulseSpeed: randomInRange(JELLYFISH_SPAWN_RANGES.pulseSpeed),
    ...rollTintSpawn(),
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

  const canvasWidth = Math.max(1, Math.round(width * JELLYFISH_RES));
  const canvasHeight = Math.max(1, Math.round(height * JELLYFISH_RES));

  return (
    <Canvas
      style={[
        styles.canvas,
        {
          width: canvasWidth,
          height: canvasHeight,
          transform: [{ scale: 1 / JELLYFISH_RES }],
        },
      ]}
      pointerEvents="none">
      <Group transform={[{ scale: JELLYFISH_RES }]}>
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
            tintMode={spawn.tintMode}
            tintStrength={spawn.tintStrength}
            tintA={spawn.tintA}
            tintB={spawn.tintB}
            tintC={spawn.tintC}
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
    top: 0,
    transformOrigin: 'top left',
  },
});
