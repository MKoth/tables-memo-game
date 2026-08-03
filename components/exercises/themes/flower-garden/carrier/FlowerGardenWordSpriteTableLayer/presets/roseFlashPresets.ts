import type { RoseTintRgb } from './roseTintPresets';

export type RoseFlashPreset = 0 | 1 | 2;

export const ROSE_FLASH_PRESETS = {
  primary: 0,
  error: 1,
  success: 2,
} as const;

export const ROSE_FLASH_PRESET_COLORS: ReadonlyArray<RoseTintRgb> = [
  [0.6, 1.3, 1.8],
  [1.15, 0.45, 0.4],
  [0.45, 1.05, 0.55],
];

/** Number of outward wave sweeps per flash (drives the "dancing" gradient). */
export const ROSE_FLASH_WAVE_COUNT = 2;

/** How many radial periods the wave packs across the rose radius. */
export const ROSE_FLASH_WAVE_RADIUS_PERIODS = 2;

/** Crest brightness multiplier applied on top of the base flash shade. */
export const ROSE_FLASH_CREST_BOOST = 1.6;

/** Strength of the base flash shade blend over the rose's own tint. */
export const ROSE_FLASH_BASE_STRENGTH = 0.9;

/** Blend strength of the traveling wave crest. */
export const ROSE_FLASH_WAVE_STRENGTH = 0.55;

export type RoseFlashUniforms = {
  flashActive: 0 | 1;
  flashColor: RoseTintRgb;
  flashCrestColor: RoseTintRgb;
  flashWave: number;
  flashBaseStrength: number;
  flashWaveStrength: number;
  flashWaveRadiusPeriods: number;
  flashBrightnessBoost: number;
};

/**
 * Pure uniform computation for the rose bud flash. A flash is active from its
 * trigger time until `flashDurationMs` later; while active the rose base shade
 * becomes the preset color and a wave phase advances (cycling
 * `ROSE_FLASH_WAVE_COUNT` times) so the shader can sweep a brighter crest from
 * the rose center outward, repeatedly ("dancing" gradient).
 */
export function computeRoseFlashUniforms(
  clockMs: number,
  flashUntilMs: number,
  preset: number,
  flashDurationMs: number,
): RoseFlashUniforms {
  'worklet';
  if (preset < 0 || clockMs >= flashUntilMs || flashDurationMs <= 0) {
    return {
      flashActive: 0,
      flashColor: ROSE_FLASH_PRESET_COLORS[0] ?? [1, 1, 1],
      flashCrestColor: ROSE_FLASH_PRESET_COLORS[0] ?? [1, 1, 1],
      flashWave: 0,
      flashBaseStrength: 0,
      flashWaveStrength: 0,
      flashWaveRadiusPeriods: ROSE_FLASH_WAVE_RADIUS_PERIODS,
      flashBrightnessBoost: 0,
    };
  }

  const color = ROSE_FLASH_PRESET_COLORS[preset] ?? ROSE_FLASH_PRESET_COLORS[0]!;
  const elapsed = clockMs - (flashUntilMs - flashDurationMs);
  const t = Math.min(1, Math.max(0, elapsed / flashDurationMs));
  const wave = (t * ROSE_FLASH_WAVE_COUNT) % 1;

  return {
    flashActive: 1,
    flashColor: color,
    flashCrestColor: [
      Math.min(1.6, color[0] * ROSE_FLASH_CREST_BOOST),
      Math.min(1.6, color[1] * ROSE_FLASH_CREST_BOOST),
      Math.min(1.6, color[2] * ROSE_FLASH_CREST_BOOST),
    ],
    flashWave: wave,
    flashBaseStrength: ROSE_FLASH_BASE_STRENGTH,
    flashWaveStrength: ROSE_FLASH_WAVE_STRENGTH,
    flashWaveRadiusPeriods: ROSE_FLASH_WAVE_RADIUS_PERIODS,
    flashBrightnessBoost: 1,
  };
}

/**
 * Persistent highlight uniforms — the same outward wave sweep as the click
 * flash, but looping forever so highlighted roses keep the moving gradient.
 */
export function computeRoseHighlightUniforms(
  clockMs: number,
  color: RoseTintRgb,
  sweepPeriodMs: number,
): RoseFlashUniforms {
  'worklet';
  const t = (clockMs % sweepPeriodMs) / sweepPeriodMs;
  const wave = (t * ROSE_FLASH_WAVE_COUNT) % 1;

  return {
    flashActive: 1,
    flashColor: color,
    flashCrestColor: [
      Math.min(1.6, color[0] * ROSE_FLASH_CREST_BOOST),
      Math.min(1.6, color[1] * ROSE_FLASH_CREST_BOOST),
      Math.min(1.6, color[2] * ROSE_FLASH_CREST_BOOST),
    ],
    flashWave: wave,
    flashBaseStrength: ROSE_FLASH_BASE_STRENGTH * 0.6,
    flashWaveStrength: ROSE_FLASH_WAVE_STRENGTH,
    flashWaveRadiusPeriods: ROSE_FLASH_WAVE_RADIUS_PERIODS,
    flashBrightnessBoost: 0.7,
  };
}
