import { useEffect, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { FlightState, type RoamerRuntimeEntry } from '../core/types';
import type { ParticleInternal, RoamerParticleConfig, RoamerParticleState } from './particleTypes';
import { updateParticlePool } from './updateParticlePool';

export function useParticleFrameLoop(
  runtimeEntries: RoamerRuntimeEntry[],
  pool: SharedValue<ParticleInternal[]>,
  lastEmitTimestamps: SharedValue<number[]>,
  config: RoamerParticleConfig,
): void {
  const lastTimestamp = useSharedValue(-1);

  const onParticleFrame = useCallback(
    (frameInfo: { timestamp: number }) => {
      'worklet';
      if (lastTimestamp.value < 0) {
        lastTimestamp.value = frameInfo.timestamp;
        const timestamps = lastEmitTimestamps.value;
        for (let i = 0; i < timestamps.length; i++) {
          timestamps[i] = frameInfo.timestamp;
        }
        lastEmitTimestamps.value = timestamps;
        return;
      }

      const elapsed = frameInfo.timestamp - lastTimestamp.value;
      const firstConfig = runtimeEntries[0]?.runtime.config;
      if (firstConfig != null && elapsed < firstConfig.simStepMs) {
        return;
      }

      const dt = Math.min(elapsed / 1000, 0.05);
      lastTimestamp.value = frameInfo.timestamp;

      if (lastEmitTimestamps.value.length < runtimeEntries.length) {
        const t = lastEmitTimestamps.value;
        const needed = runtimeEntries.length - t.length;
        for (let i = 0; i < needed; i++) {
          t.push(frameInfo.timestamp);
        }
        lastEmitTimestamps.value = t;
      }

      const roamerStates: RoamerParticleState[] = [];
      for (let i = 0; i < runtimeEntries.length; i++) {
        const entry = runtimeEntries[i]!;
        roamerStates.push({
          x: entry.runtime.x.value,
          y: entry.runtime.y.value,
          angle: entry.runtime.angle.value,
          flightState: entry.runtime.state.value as FlightState,
          species: entry.spawn.species,
        });
      }

      updateParticlePool(
        pool.value,
        roamerStates,
        config,
        dt,
        frameInfo.timestamp,
        lastEmitTimestamps.value,
        Math.random,
      );

      pool.value = pool.value.slice();
      lastEmitTimestamps.value = lastEmitTimestamps.value.slice();
    },
    [lastTimestamp, pool, lastEmitTimestamps, runtimeEntries, config],
  );

  const particleLoop = useFrameCallback(onParticleFrame, true);

  useEffect(() => {
    const syncActive = (state: AppStateStatus) => {
      particleLoop.setActive(state === 'active');
      if (state !== 'active') {
        lastTimestamp.value = -1;
      }
    };
    syncActive(AppState.currentState);
    const subscription = AppState.addEventListener('change', syncActive);
    return () => subscription.remove();
  }, [particleLoop, lastTimestamp]);
}
