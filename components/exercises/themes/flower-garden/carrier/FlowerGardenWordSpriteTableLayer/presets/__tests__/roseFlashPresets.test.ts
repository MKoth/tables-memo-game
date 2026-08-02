import {
  computeRoseFlashUniforms,
  ROSE_FLASH_CREST_BOOST,
  ROSE_FLASH_PRESET_COLORS,
  ROSE_FLASH_PRESETS,
  ROSE_FLASH_WAVE_COUNT,
} from '../roseFlashPresets';

const DURATION = 800;

describe('computeRoseFlashUniforms', () => {
  it('is inactive when no preset is set', () => {
    const u = computeRoseFlashUniforms(1000, 0, -1, DURATION);
    expect(u.flashActive).toBe(0);
    expect(u.flashBaseStrength).toBe(0);
    expect(u.flashWaveStrength).toBe(0);
  });

  it('is inactive after the flash duration elapses', () => {
    const flashUntil = 1000 + DURATION;
    const u = computeRoseFlashUniforms(flashUntil, flashUntil, 0, DURATION);
    expect(u.flashActive).toBe(0);
  });

  it('is active during the flash window', () => {
    const u = computeRoseFlashUniforms(1000 + DURATION / 2, 1000 + DURATION, 0, DURATION);
    expect(u.flashActive).toBe(1);
  });

  it('ignores a flash with zero duration', () => {
    const u = computeRoseFlashUniforms(1000, 1000, 0, 0);
    expect(u.flashActive).toBe(0);
  });

  it('maps presets to the undersea palette colors (primary/error/success)', () => {
    const primary = computeRoseFlashUniforms(1000, 1000 + DURATION, ROSE_FLASH_PRESETS.primary, DURATION);
    expect(primary.flashColor).toEqual(ROSE_FLASH_PRESET_COLORS[0]);

    const error = computeRoseFlashUniforms(1000, 1000 + DURATION, ROSE_FLASH_PRESETS.error, DURATION);
    expect(error.flashColor).toEqual(ROSE_FLASH_PRESET_COLORS[1]);

    const success = computeRoseFlashUniforms(1000, 1000 + DURATION, ROSE_FLASH_PRESETS.success, DURATION);
    expect(success.flashColor).toEqual(ROSE_FLASH_PRESET_COLORS[2]);
  });

  it('crest color is brighter than the base shade', () => {
    const u = computeRoseFlashUniforms(1000, 1000 + DURATION, ROSE_FLASH_PRESETS.success, DURATION);
    expect(u.flashCrestColor[0]).toBeGreaterThan(u.flashColor[0]);
    expect(u.flashCrestColor[1]).toBeGreaterThan(u.flashColor[1]);
    expect(u.flashCrestColor[2]).toBeGreaterThan(u.flashColor[2]);
    expect(u.flashCrestColor).toEqual(
      u.flashColor.map(c => Math.min(1.6, c * ROSE_FLASH_CREST_BOOST)),
    );
  });

  it('wave phase starts at 0 and cycles ROSE_FLASH_WAVE_COUNT times over the flash', () => {
    const atStart = computeRoseFlashUniforms(1000, 1000 + DURATION, 0, DURATION);
    expect(atStart.flashWave).toBe(0);

    const quarter = computeRoseFlashUniforms(1000 + DURATION * 0.25, 1000 + DURATION, 0, DURATION);
    expect(quarter.flashWave).toBeCloseTo(ROSE_FLASH_WAVE_COUNT * 0.25 % 1, 5);

    const mid = computeRoseFlashUniforms(1000 + DURATION * 0.5, 1000 + DURATION, 0, DURATION);
    expect(mid.flashWave).toBeCloseTo((ROSE_FLASH_WAVE_COUNT * 0.5) % 1, 5);
  });

  it('clamps wave progress to the end of the flash', () => {
    const beyond = computeRoseFlashUniforms(1000 + DURATION + 500, 1000 + DURATION, 0, DURATION);
    expect(beyond.flashActive).toBe(0);
  });
});
