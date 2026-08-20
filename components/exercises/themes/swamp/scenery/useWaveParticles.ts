import { useRef } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { makeMutable, useFrameCallback } from 'react-native-reanimated';
import type { Mutable } from 'react-native-reanimated/lib/typescript/commonTypes';
import { MAX_WAVES } from '../shaders/waterWaves';

export const waveManagerDefaults = {
  waveSpeed: 120,
  waveWidth: 12,
  waveStrength: 12.0,
  waveDecay: 0.025,
  maxRadius: 280,
  duration: 1000,
  maxWaves: MAX_WAVES,
} as const;

export type WaveParticleConfig = {
  maxWaves: number;
  waveSpeed: number;
  waveWidth: number;
  waveStrength: number;
  waveDecay: number;
  maxRadius: number;
  duration: number;
  screenBounds: { width: number; height: number };
  clock: SharedValue<number>;
  targetWaveCount?: Mutable<number>;
};

type WaveSlot = {
  x: number;
  y: number;
  birthTime: number;
};

export function useWaveParticles(config: WaveParticleConfig) {
  const {
    maxWaves,
    waveSpeed,
    waveWidth,
    waveStrength,
    waveDecay,
    maxRadius,
    duration,
    screenBounds,
    clock,
    targetWaveCount: targetWaveCountMutable,
  } = config;

  const durationSec = duration / 1000;

  const initialSlots: WaveSlot[] = [];
  for (let i = 0; i < maxWaves; i++) {
    initialSlots.push({
      x: Math.random() * screenBounds.width,
      y: Math.random() * screenBounds.height,
      birthTime: -Math.random() * durationSec,
    });
  }
  const slotsRef = useRef<WaveSlot[]>(initialSlots);

  const waveCenters = useRef(makeMutable<number[]>(Array(maxWaves * 2).fill(0))).current;
  const waveRadii = useRef(makeMutable<number[]>(Array(maxWaves).fill(0))).current;
  const waveStrengths = useRef(makeMutable<number[]>(Array(maxWaves).fill(waveStrength))).current;
  const waveWidths = useRef(makeMutable<number[]>(Array(maxWaves).fill(waveWidth))).current;
  const waveCount = useRef(makeMutable(maxWaves)).current;
  const prevCountRef = useRef(0);

  useFrameCallback(() => {
    'worklet';
    const now = clock.value / 1000;
    const slots = slotsRef.current;
    const centers = waveCenters.value;
    const radii = waveRadii.value;
    const strengths = waveStrengths.value;
    const widths = waveWidths.value;
    const count = targetWaveCountMutable
      ? targetWaveCountMutable.value
      : maxWaves;
    const prevCount = prevCountRef.current;

    for (let i = 0; i < maxWaves; i++) {
      if (i < count) {
        const slot = slots[i]!;

        if (i >= prevCount) {
          slot.x = Math.random() * screenBounds.width;
          slot.y = Math.random() * screenBounds.height;
          slot.birthTime = now - Math.random() * durationSec;
        }

        const age = now - slot.birthTime;

        if (age >= durationSec || age < 0) {
          slot.x = Math.random() * screenBounds.width;
          slot.y = Math.random() * screenBounds.height;
          slot.birthTime = now;
        }

        const r = Math.max(0, (now - slot.birthTime) * waveSpeed);
        centers[i * 2] = slot.x;
        centers[i * 2 + 1] = slot.y;
        radii[i] = r;
        strengths[i] = waveStrength;
        widths[i] = waveWidth;
      } else {
        centers[i * 2] = 0;
        centers[i * 2 + 1] = 0;
        radii[i] = 0;
        strengths[i] = 0;
        widths[i] = 0;
      }
    }

    waveCount.value = count;
    prevCountRef.current = count;
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
