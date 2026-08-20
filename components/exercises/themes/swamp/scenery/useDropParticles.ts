import { useRef } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { makeMutable, useFrameCallback } from 'react-native-reanimated';
import {
  SPAWN_INTERVAL_MS,
  DROP_SCREEN_MULTIPLIER,
  DROP_OFFSET_X,
  DROP_OFFSET_Y,
  DROP_EXISTENCE_MS,
  DROP_FADE_IN_MS,
  DROP_FADE_OUT_MS,
  DROP_SIZE_START_MIN,
  DROP_SIZE_START_MAX,
  DROP_SIZE_END_MIN,
  DROP_SIZE_END_MAX,
  DROP_WAVE_SPEED,
  DROP_WAVE_WIDTH,
  DROP_WAVE_STRENGTH,
  DROP_WAVE_DECAY,
  DROP_TOTAL_LIFECYCLE_MS,
} from '../config/dropConfig';
import { MAX_WAVES } from '../shaders/waterWaves';

const STRIDE = 7;
const MAX_UNIFORM_DROPS = 32;

type DropParticleConfig = {
  screenBounds: { width: number; height: number };
  clock: SharedValue<number>;
};

type DropSlot = {
  birthTime: number;
  spawnX: number;
  spawnY: number;
  targetX: number;
  targetY: number;
  startSize: number;
  endSize: number;
  variant: number;
};

export function useDropParticles(config: DropParticleConfig) {
  const { screenBounds, clock } = config;

  const slotsRef = useRef<DropSlot[]>(
    Array.from({ length: MAX_UNIFORM_DROPS }, () => ({
      birthTime: -999999, spawnX: 0, spawnY: 0,
      targetX: 0, targetY: 0, startSize: 0, endSize: 0, variant: 0,
    })),
  );
  const nextSpawnRef = useRef(makeMutable(0));
  const writeIdxRef = useRef(makeMutable(0));

  const dropFlat = useRef(makeMutable<number[]>(Array(MAX_UNIFORM_DROPS * STRIDE).fill(0))).current;
  const waveCenters = useRef(makeMutable<number[]>(Array(MAX_WAVES * 2).fill(0))).current;
  const waveRadii = useRef(makeMutable<number[]>(Array(MAX_WAVES).fill(0))).current;
  const waveStrengths = useRef(makeMutable<number[]>(Array(MAX_WAVES).fill(DROP_WAVE_STRENGTH))).current;
  const waveWidths = useRef(makeMutable<number[]>(Array(MAX_WAVES).fill(DROP_WAVE_WIDTH))).current;
  const waveCount = useRef(makeMutable(0)).current;

  useFrameCallback(() => {
    'worklet';
    const now = clock.value;
    const W = screenBounds.width;
    const H = screenBounds.height;
    const slots = slotsRef.current;
    const d = dropFlat.value;
    const wC = waveCenters.value;
    const wR = waveRadii.value;
    const wS = waveStrengths.value;
    const wW = waveWidths.value;

    const centerX = W / 2 + DROP_OFFSET_X;
    const centerY = H / 2 + DROP_OFFSET_Y;
    const imagW = W * DROP_SCREEN_MULTIPLIER;
    const imagH = H * DROP_SCREEN_MULTIPLIER;

    let nextSpawn = nextSpawnRef.current.value;
    if (nextSpawn === 0) {
      nextSpawn = now;
    }

    if (now >= nextSpawn) {
      for (let i = 0; i < MAX_UNIFORM_DROPS; i++) {
        const age = now - slots[i]!.birthTime;
        if (age >= DROP_TOTAL_LIFECYCLE_MS || slots[i]!.birthTime === -999999) {
          const s = slots[i]!;
          s.birthTime = now;
          s.spawnX = centerX + (Math.random() - 0.5) * imagW;
          s.spawnY = centerY + (Math.random() - 0.5) * imagH;
          s.targetX = W / 2 + (s.spawnX - centerX) / DROP_SCREEN_MULTIPLIER;
          s.targetY = H / 2 + (s.spawnY - centerY) / DROP_SCREEN_MULTIPLIER;
          s.startSize = DROP_SIZE_START_MIN + Math.random() * (DROP_SIZE_START_MAX - DROP_SIZE_START_MIN);
          s.endSize = DROP_SIZE_END_MIN + Math.random() * (DROP_SIZE_END_MAX - DROP_SIZE_END_MIN);
          s.variant = Math.floor(Math.random() * 3);
          break;
        }
      }
      nextSpawn += SPAWN_INTERVAL_MS;
    }

    let dropIdx = 0;
    let waveIdx = 0;

    for (let i = 0; i < MAX_UNIFORM_DROPS; i++) {
      const s = slots[i]!;
      const ageMs = now - s.birthTime;

      if (ageMs < 0 || ageMs >= DROP_TOTAL_LIFECYCLE_MS) {
        continue;
      }

      if (ageMs >= DROP_EXISTENCE_MS) {
        if (waveIdx < MAX_WAVES) {
          const waveAgeSec = (ageMs - DROP_EXISTENCE_MS) / 1000;
          wC[waveIdx * 2] = s.targetX;
          wC[waveIdx * 2 + 1] = s.targetY;
          wR[waveIdx] = waveAgeSec * DROP_WAVE_SPEED;
          wS[waveIdx] = DROP_WAVE_STRENGTH;
          wW[waveIdx] = DROP_WAVE_WIDTH;
          waveIdx++;
        }
        continue;
      }

      const t = ageMs / DROP_EXISTENCE_MS;
      const x = s.spawnX + (s.targetX - s.spawnX) * t;
      const y = s.spawnY + (s.targetY - s.spawnY) * t;
      const size = s.startSize + (s.endSize - s.startSize) * t;

      let opacity = 1;
      if (ageMs < DROP_FADE_IN_MS) {
        opacity = ageMs / DROP_FADE_IN_MS;
      } else if (ageMs > DROP_EXISTENCE_MS - DROP_FADE_OUT_MS) {
        opacity = (DROP_EXISTENCE_MS - ageMs) / DROP_FADE_OUT_MS;
      }
      opacity = Math.max(0, Math.min(1, opacity));

      const base = dropIdx * STRIDE;
      d[base] = x;
      d[base + 1] = y;
      d[base + 2] = size;
      d[base + 3] = size;
      d[base + 4] = opacity;
      d[base + 5] = s.variant;
      d[base + 6] = ageMs;
      dropIdx++;
    }

    for (let i = dropIdx; i < MAX_UNIFORM_DROPS; i++) {
      const base = i * STRIDE;
      d[base] = 0; d[base + 1] = 0; d[base + 2] = 0;
      d[base + 3] = 0; d[base + 4] = 0; d[base + 5] = 0;
      d[base + 6] = 0;
    }

    for (let i = waveIdx; i < MAX_WAVES; i++) {
      wC[i * 2] = 0; wC[i * 2 + 1] = 0;
      wR[i] = 0; wS[i] = 0; wW[i] = 0;
    }

    waveCount.value = waveIdx;
    writeIdxRef.current.value = dropIdx;
    nextSpawnRef.current.value = nextSpawn;
    dropFlat.value = dropFlat.value.slice();
  });

  return {
    dropFlat,
    waveCenters,
    waveRadii,
    waveStrengths,
    waveWidths,
    waveCount,
    waveDecay: DROP_WAVE_DECAY,
  };
}
