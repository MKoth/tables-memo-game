import type { WaveIntensityTimeline } from '../scenery/useWaveIntensityTimeline';

/**
 * Wave intensity timeline — controls how many ambient waves are active over time.
 *
 * Each step defines a duration range (ms) and the number of simultaneous waves.
 * The actual duration is randomly chosen between min and max each cycle.
 * The timeline loops: after the last step it restarts with fresh random durations.
 */
export const WAVE_INTENSITY_TIMELINE: WaveIntensityTimeline = [
  { durationMinMs: 25_000, durationMaxMs: 35_000, waveCount: 19 }, // full rain
  { durationMinMs: 4_000, durationMaxMs: 7_000, waveCount: 7 }, // ease to moderate
  { durationMinMs: 4_000, durationMaxMs: 7_000, waveCount: 3 }, // light
  { durationMinMs: 4_000, durationMaxMs: 7_000, waveCount: 0 }, // calm
  { durationMinMs: 25_000, durationMaxMs: 35_000, waveCount: 0 }, // still water
  { durationMinMs: 4_000, durationMaxMs: 7_000, waveCount: 3 }, // picking up
  { durationMinMs: 4_000, durationMaxMs: 7_000, waveCount: 7 }, // moderate
  { durationMinMs: 25_000, durationMaxMs: 35_000, waveCount: 19 }, // full rain
];
