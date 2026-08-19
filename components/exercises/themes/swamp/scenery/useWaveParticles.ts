import { useRef } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { makeMutable, useFrameCallback } from 'react-native-reanimated';
import {
  type WaterWave,
  MAX_WAVES,
  singleWaveDefaults,
} from '../shaders/waterWaves';

export const waveManagerDefaults = {
  generationInterval: 1800,
  minPerCycle: 1,
  maxPerCycle: 2,
  waveSpeed: 80,
  waveWidth: 12,
  waveStrength: 4.0,
  waveDecay: 0.0015,
  maxRadius: 280,
  duration: 4000,
  maxWaves: MAX_WAVES,
} as const;

export type WaveParticleConfig = {
  maxWaves: number;
  generationInterval: number;
  minPerCycle: number;
  maxPerCycle: number;
  waveSpeed: number;
  waveWidth: number;
  waveStrength: number;
  waveDecay: number;
  maxRadius: number;
  duration: number;
  screenBounds: { width: number; height: number };
  clock: SharedValue<number>;
};

export function useWaveParticles(config: WaveParticleConfig) {
  const {
    maxWaves,
    generationInterval,
    minPerCycle,
    maxPerCycle,
    waveSpeed,
    waveWidth,
    waveStrength,
    waveDecay,
    maxRadius,
    duration,
    screenBounds,
    clock,
  } = config;

  const wavesRef = useRef<WaterWave[]>([]);
  const lastSpawnRef = useRef(0);

  const waveCenters = useRef(makeMutable<number[]>(Array(maxWaves * 2).fill(0))).current;
  const waveRadii = useRef(makeMutable<number[]>(Array(maxWaves).fill(0))).current;
  const waveStrengths = useRef(makeMutable<number[]>(Array(maxWaves).fill(0))).current;
  const waveWidths = useRef(makeMutable<number[]>(Array(maxWaves).fill(waveWidth))).current;
  const waveCount = useRef(makeMutable(0)).current;

  useFrameCallback(() => {
    'worklet';
    const now = clock.value / 1000;
    const elapsed = now - lastSpawnRef.current;

    if (elapsed >= generationInterval / 1000) {
      lastSpawnRef.current = now;
      const count =
        minPerCycle + Math.floor(Math.random() * (maxPerCycle - minPerCycle + 1));
      for (let i = 0; i < count; i++) {
        if (wavesRef.current.length >= maxWaves) {
          wavesRef.current.shift();
        }
        wavesRef.current.push({
          x: Math.random() * screenBounds.width,
          y: Math.random() * screenBounds.height,
          birthTime: now,
          duration,
          maxRadius,
          strength: waveStrength,
          width: waveWidth,
        });
      }
    }

    wavesRef.current = wavesRef.current.filter(w => {
      const ageMs = (now - w.birthTime) * 1000;
      const radius = Math.max(0, (now - w.birthTime) * waveSpeed);
      return ageMs <= w.duration && radius <= w.maxRadius;
    });

    const count = Math.min(wavesRef.current.length, maxWaves);
    const centers = waveCenters.value;
    const radii = waveRadii.value;
    const strengths = waveStrengths.value;
    const widths = waveWidths.value;
    for (let i = 0; i < maxWaves; i++) {
      if (i < count) {
        const w = wavesRef.current[i]!;
        centers[i * 2] = w.x;
        centers[i * 2 + 1] = w.y;
        radii[i] = Math.max(0, (now - w.birthTime) * waveSpeed);
        strengths[i] = w.strength;
        widths[i] = w.width;
      } else {
        centers[i * 2] = 0;
        centers[i * 2 + 1] = 0;
        radii[i] = 0;
        strengths[i] = 0;
        widths[i] = 0;
      }
    }
    waveCount.value = count;
  });

  return {
    waveCenters,
    waveRadii,
    waveStrengths,
    waveWidths,
    waveCount,
    waveDecay,
  };
}
