import { useRef } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { makeMutable, useFrameCallback } from 'react-native-reanimated';
import type { Mutable } from 'react-native-reanimated/lib/typescript/commonTypes';

export type WaveIntensityStep = {
  durationMinMs: number;
  durationMaxMs: number;
  waveCount: number;
};

export type WaveIntensityTimeline = WaveIntensityStep[];

export function useWaveIntensityTimeline(
  clock: SharedValue<number>,
  timeline: WaveIntensityTimeline,
): Mutable<number> {
  const stepCount = timeline.length;
  const maxTotalMs = timeline.reduce((sum, s) => sum + s.durationMaxMs, 0);
  const resolvedRef = useRef(
    makeMutable(timeline.map(s => s.durationMinMs)),
  );
  const totalRef = useRef(
    makeMutable(timeline.reduce((sum, s) => sum + s.durationMinMs, 0)),
  );
  const waveCountRef = useRef(makeMutable(timeline[0]!.waveCount));

  useFrameCallback(() => {
    'worklet';
    const elapsed = clock.value;

    if (elapsed >= totalRef.current.value) {
      let newTotal = 0;
      for (let i = 0; i < stepCount; i++) {
        const step = timeline[i]!;
        const range = step.durationMaxMs - step.durationMinMs;
        const dur =
          range > 0
            ? step.durationMinMs + Math.random() * range
            : step.durationMinMs;
        resolvedRef.current.value[i] = dur;
        newTotal += dur;
      }
      totalRef.current.value = newTotal;
    }

    const t = elapsed % totalRef.current.value;
    let acc = 0;
    let count = timeline[0]!.waveCount;
    for (let i = 0; i < stepCount; i++) {
      const dur = resolvedRef.current.value[i]!;
      if (t < acc + dur) {
        count = timeline[i]!.waveCount;
        break;
      }
      acc += dur;
    }
    waveCountRef.current.value = count;
  });

  return waveCountRef.current;
}
