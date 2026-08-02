import { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useExerciseClockQuantized } from '../../../../core';
import { FlightState, type RoamerRuntimeEntry, type SwimZone } from './types';
import { lerpAngle } from './roamerSimHelpers';
import { updateRoamer } from './updateRoamer';

export function useRoamerSimFrameLoop(
  runtimes: RoamerRuntimeEntry[],
  swimZone: SwimZone,
  sharedPositions: SharedValue<number[]>,
  fieldFlowerAnchorsX: number[],
  fieldFlowerAnchorsY: number[],
  occupantSlots: SharedValue<number[]>,
  flowerSwingAmplitudes: number[],
  flowerSwingSpeeds: number[],
  flowerSwingPhases: number[],
  flowerSwingAngles: number[],
  flowerSwingBoosts: SharedValue<number[]> | undefined,
  capturedRoamerIndex: SharedValue<number>,
  orbCaptureCenterX: number,
  orbCaptureCenterY: number,
  orbCaptureRadius: number,
  onRoamerEscaped?: (roamerIndex: number) => void,
): void {
  const lastTimestamp = useSharedValue(-1);
  const exerciseClock = useExerciseClockQuantized(20);
  const roamerCount = runtimes.length;
  const reportedEscapes = useSharedValue<number[]>([]);

  const onSimFrame = useCallback(
    (frameInfo: { timestamp: number }) => {
      'worklet';
      if (lastTimestamp.value < 0) {
        lastTimestamp.value = frameInfo.timestamp;
        return;
      }

      const elapsed = frameInfo.timestamp - lastTimestamp.value;
      const firstConfig = runtimes[0]?.runtime.config;
      if (firstConfig != null && elapsed < firstConfig.simStepMs) {
        return;
      }
      const dt = Math.min(elapsed / 1000, 0.05);
      lastTimestamp.value = frameInfo.timestamp;
      const elapsedMs = exerciseClock.value;

      const pos = sharedPositions.value;
      const occSlots = occupantSlots.value.slice();
      const boosts = flowerSwingBoosts != null ? flowerSwingBoosts.value.slice() : [];
      const decayRate = firstConfig?.flowerSwingBoostDecayRate ?? 2.5;
      for (let i = 0; i < boosts.length; i++) {
        if (boosts[i] > 0) {
          boosts[i] = Math.max(0, boosts[i] - decayRate * dt);
        }
      }

      for (let i = 0; i < roamerCount; i++) {
        const runtime = runtimes[i]!.runtime;
        const stateNow = runtime.state.value as FlightState;

        if (stateNow === FlightState.ESCAPED) {
          if (!reportedEscapes.value.includes(i)) {
            reportedEscapes.value = [...reportedEscapes.value, i];
            if (onRoamerEscaped != null) {
              scheduleOnRN(onRoamerEscaped, i);
            }
          }
          continue;
        }

        const isCaptured = i === capturedRoamerIndex.value;

        updateRoamer(
          runtime,
          dt,
          swimZone,
          fieldFlowerAnchorsX,
          fieldFlowerAnchorsY,
          occSlots,
          i,
          elapsedMs,
          flowerSwingAmplitudes,
          flowerSwingSpeeds,
          flowerSwingPhases,
          flowerSwingAngles,
          boosts,
        );

        if (isCaptured) {
          const dx = runtime.x.value - orbCaptureCenterX;
          const dy = runtime.y.value - orbCaptureCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > orbCaptureRadius && dist > 0) {
            const scale = orbCaptureRadius / dist;
            runtime.x.value = orbCaptureCenterX + dx * scale;
            runtime.y.value = orbCaptureCenterY + dy * scale;
          }
        }

        if (
          !isCaptured &&
          (runtime.state.value === FlightState.FLYING_CRUISE ||
            runtime.state.value === FlightState.APPROACH_FLOWER)
        ) {
          const rc = runtime.config;
          const sepRadiusSq = rc.separationRadius * rc.separationRadius;
          const fx = runtime.x.value;
          const fy = runtime.y.value;

          for (let j = 0; j < roamerCount; j++) {
            if (j === i) {
              continue;
            }
            const other = runtimes[j]!.runtime;
            const dx = fx - other.x.value;
            const dy = fy - other.y.value;
            const distSq = dx * dx + dy * dy;
            if (distSq < sepRadiusSq && distSq > 0.25) {
              const dist = Math.sqrt(distSq);
              const overlap = 1 - dist / rc.separationRadius;
              const awayAngle = Math.atan2(dy, dx) + Math.PI / 2;
              const str = Math.min(1, overlap * rc.separationSteer * dt);
              runtime.angle.value = lerpAngle(runtime.angle.value, awayAngle, str);
              runtime.wanderAngle.value = lerpAngle(runtime.wanderAngle.value, awayAngle, str);
            }
          }
        }

        pos[i * 2] = runtime.x.value;
        pos[i * 2 + 1] = runtime.y.value;
      }

      occupantSlots.value = occSlots;
      sharedPositions.value = pos;
      if (flowerSwingBoosts != null) {
        flowerSwingBoosts.value = boosts;
      }
    },
    [
      lastTimestamp,
      reportedEscapes,
      sharedPositions,
      occupantSlots,
      roamerCount,
      runtimes,
      swimZone,
      fieldFlowerAnchorsX,
      fieldFlowerAnchorsY,
      flowerSwingAmplitudes,
      flowerSwingSpeeds,
      flowerSwingPhases,
      flowerSwingAngles,
      exerciseClock,
      flowerSwingBoosts,
      capturedRoamerIndex,
      orbCaptureCenterX,
      orbCaptureCenterY,
      orbCaptureRadius,
      onRoamerEscaped,
    ],
  );

  const simLoop = useFrameCallback(onSimFrame, true);

  useEffect(() => {
    const syncActive = (state: AppStateStatus) => {
      simLoop.setActive(state === 'active');
      if (state !== 'active') {
        lastTimestamp.value = -1;
      }
    };
    syncActive(AppState.currentState);
    const subscription = AppState.addEventListener('change', syncActive);
    return () => subscription.remove();
  }, [simLoop, lastTimestamp]);
}
