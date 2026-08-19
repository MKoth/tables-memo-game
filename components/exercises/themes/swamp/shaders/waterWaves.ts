export type WaterWave = {
  x: number;
  y: number;
  birthTime: number;
  duration: number;
  maxRadius: number;
  strength: number;
  width: number;
};

export const MAX_WAVES = 16;

export const singleWaveDefaults = {
  waveSpeed: 80.0,
  waveWidth: 12.0,
  waveStrength: 9.0,
  waveDecay: 0.0095,
  waveMaxRadius: 1400,
  waveDuration: 3000,
} as const;

export const multiWaveDefaults = {
  maxWaves: 16,
} as const;

export const waterWaveLayerMultiplier = {
  floor: 0.6,
  stone: 1.0,
  algae: 1.3,
} as const;

export function computeWaveRadius(
  iTimeSec: number,
  birthTimeSec: number,
  waveSpeed: number,
): number {
  return Math.max(0, (iTimeSec - birthTimeSec) * waveSpeed);
}

export function computeWaveAge(iTimeSec: number, birthTimeSec: number): number {
  return Math.max(0, iTimeSec - birthTimeSec);
}

export function isWaveActive(
  iTimeSec: number,
  wave: WaterWave,
  waveSpeed: number,
): boolean {
  if (iTimeSec < wave.birthTime) {
    return false;
  }
  const radius = computeWaveRadius(iTimeSec, wave.birthTime, waveSpeed);
  const ageMs = computeWaveAge(iTimeSec, wave.birthTime) * 1000;
  return radius <= wave.maxRadius && ageMs <= wave.duration && radius >= 0;
}

export function computeWaveUniforms(
  wave: WaterWave,
  iTimeSec: number,
  waveSpeed: number,
  waveDecay: number,
): {
  waveCenter: [number, number];
  waveRadius: number;
  waveStrength: number;
  waveWidth: number;
  waveDecay: number;
  waveActive: number;
} {
  const waveRadius = computeWaveRadius(iTimeSec, wave.birthTime, waveSpeed);
  const waveActive = isWaveActive(iTimeSec, wave, waveSpeed) ? 1 : 0;
  return {
    waveCenter: [wave.x, wave.y],
    waveRadius,
    waveStrength: wave.strength,
    waveWidth: wave.width,
    waveDecay,
    waveActive,
  };
}

export function computeLoopedWaveRadius(
  iTimeSec: number,
  birthTimeSec: number,
  waveSpeed: number,
  durationMs: number,
): number {
  const age = Math.max(0, iTimeSec - birthTimeSec);
  const cycle = age % (durationMs / 1000);
  return cycle * waveSpeed;
}

export type MultiWaveUniforms = {
  waveCenters: number[];
  waveRadii: number[];
  waveStrengths: number[];
  waveWidths: number[];
  waveCount: number;
  waveDecay: number;
};

export function padFloatArray(
  src: readonly number[],
  targetLen: number,
  fill = 0,
): number[] {
  const out = [...src];
  while (out.length < targetLen) {
    out.push(fill);
  }
  return out.slice(0, targetLen);
}

export function padVec2Array(
  src: readonly (readonly [number, number])[] | readonly number[],
  targetCount: number,
): number[] {
  const flat: number[] = [];
  if (src.length === 0) {
    return Array(targetCount * 2).fill(0);
  }
  if (typeof src[0] === 'number') {
    const nums = src as readonly number[];
    for (let i = 0; i < targetCount * 2; i++) {
      flat.push(i < nums.length ? nums[i]! : 0);
    }
    return flat;
  }
  const pairs = src as readonly (readonly [number, number])[];
  for (let i = 0; i < targetCount; i++) {
    const p = pairs[i];
    if (p) {
      flat.push(p[0], p[1]);
    } else {
      flat.push(0, 0);
    }
  }
  return flat;
}

export function computeMultiWaveUniforms(
  waves: readonly WaterWave[],
  iTimeSec: number,
  waveSpeed: number,
  waveDecay: number,
  maxWaves: number = MAX_WAVES,
): MultiWaveUniforms {
  const count = Math.min(waves.length, maxWaves);
  const centers: [number, number][] = [];
  const radii: number[] = [];
  const strengths: number[] = [];
  const widths: number[] = [];
  for (let i = 0; i < count; i++) {
    const w = waves[i]!;
    centers.push([w.x, w.y]);
    radii.push(computeWaveRadius(iTimeSec, w.birthTime, waveSpeed));
    strengths.push(w.strength);
    widths.push(w.width);
  }
  return {
    waveCenters: padVec2Array(centers, maxWaves),
    waveRadii: padFloatArray(radii, maxWaves, 0),
    waveStrengths: padFloatArray(strengths, maxWaves, 0),
    waveWidths: padFloatArray(widths, maxWaves, 12),
    waveCount: count,
    waveDecay,
  };
}
