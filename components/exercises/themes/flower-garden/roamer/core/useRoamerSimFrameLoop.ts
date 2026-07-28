import { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { useExerciseClockQuantized } from '../../../../core';
import { FlightState, type RoamerRuntimeEntry, type SwimZone } from './types';
import type { RoamerConfig } from './roamerConfig';
import {
  ROAMER_BUTTERFLY_BOUNDARY_MARGIN,
} from '../butterfly/config/butterflySimConfig';
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
  config: RoamerConfig,
): void {
  const lastTimestamp = useSharedValue(-1);
  const exerciseClock = useExerciseClockQuantized(20);
  const roamerCount = runtimes.length;

  const steerMinX = swimZone.x + swimZone.w * config.boundaryMarginRatio;
  const steerMaxX = swimZone.x + swimZone.w * (1 - config.boundaryMarginRatio);
  const steerMinY = swimZone.y + swimZone.h * config.boundaryMarginRatio;
  const steerMaxY = swimZone.y + swimZone.h * (1 - config.boundaryMarginRatio);
  const hardMinX = swimZone.x + ROAMER_BUTTERFLY_BOUNDARY_MARGIN;
  const hardMaxX = swimZone.x + swimZone.w - ROAMER_BUTTERFLY_BOUNDARY_MARGIN;
  const hardMinY = swimZone.y + ROAMER_BUTTERFLY_BOUNDARY_MARGIN;
  const hardMaxY = swimZone.y + swimZone.h - ROAMER_BUTTERFLY_BOUNDARY_MARGIN;
  const centerX = swimZone.x + swimZone.w * 0.5;
  const centerY = swimZone.y + swimZone.h * 0.5;

  const SEPARATION_RADIUS_SQ = config.separationRadius * config.separationRadius;
  const SEPARATION_MIN_DIST_SQ = 0.25;

  const onSimFrame = useCallback(
    (frameInfo: { timestamp: number }) => {
      'worklet';
      if (lastTimestamp.value < 0) {
        lastTimestamp.value = frameInfo.timestamp;
        return;
      }

      const elapsed = frameInfo.timestamp - lastTimestamp.value;
      if (elapsed < config.simStepMs) {
        return;
      }
      const dt = Math.min(elapsed / 1000, 0.05);
      lastTimestamp.value = frameInfo.timestamp;
      const elapsedMs = exerciseClock.value;

      const pos = sharedPositions.value;
      const occSlots = occupantSlots.value.slice();
      const boosts = flowerSwingBoosts != null ? flowerSwingBoosts.value.slice() : [];
      for (let i = 0; i < boosts.length; i++) {
        if (boosts[i] > 0) {
          boosts[i] = Math.max(0, boosts[i] - config.flowerSwingBoostDecayRate * dt);
        }
      }

      for (let i = 0; i < roamerCount; i++) {
        const runtime = runtimes[i]!.runtime;

        updateRoamer(
          runtime,
          config,
          dt,
          steerMinX,
          steerMaxX,
          steerMinY,
          steerMaxY,
          hardMinX,
          hardMaxX,
          hardMinY,
          hardMaxY,
          centerX,
          centerY,
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

        if (
          runtime.state.value === FlightState.FLYING_CRUISE ||
          runtime.state.value === FlightState.APPROACH_FLOWER
        ) {
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
            if (distSq < SEPARATION_RADIUS_SQ && distSq > SEPARATION_MIN_DIST_SQ) {
              const dist = Math.sqrt(distSq);
              const overlap = 1 - dist / config.separationRadius;
              const awayAngle = Math.atan2(dy, dx) + Math.PI / 2;
              const str = Math.min(1, overlap * config.separationSteer * dt);
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
      sharedPositions,
      occupantSlots,
      roamerCount,
      runtimes,
      steerMinX,
      steerMaxX,
      steerMinY,
      steerMaxY,
      hardMinX,
      hardMaxX,
      hardMinY,
      hardMaxY,
      centerX,
      centerY,
      fieldFlowerAnchorsX,
      fieldFlowerAnchorsY,
      flowerSwingAmplitudes,
      flowerSwingSpeeds,
      flowerSwingPhases,
      flowerSwingAngles,
      exerciseClock,
      flowerSwingBoosts,
      config,
      SEPARATION_RADIUS_SQ,
      SEPARATION_MIN_DIST_SQ,
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
