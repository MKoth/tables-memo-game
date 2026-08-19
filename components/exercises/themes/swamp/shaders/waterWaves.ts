export type WaterWave = {
  x: number;
  y: number;
  birthTime: number;
  duration: number;
  maxRadius: number;
  strength: number;
  width: number;
};

export const singleWaveDefaults = {
  waveSpeed: 80.0,
  waveWidth: 12.0,
  waveStrength: 9.0,
  waveDecay: 0.0095,
  waveMaxRadius: 1400,
  waveDuration: 3000,
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
