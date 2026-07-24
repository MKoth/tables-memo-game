import { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { FlightState, type ButterflyRuntimeEntry, type SwimZone } from './types';
import {
  ROAMER_BUTTERFLY_BOUNDARY_MARGIN,
  ROAMER_BUTTERFLY_BOUNDARY_MARGIN_RATIO,
  ROAMER_BUTTERFLY_SEPARATION_RADIUS,
  ROAMER_BUTTERFLY_SEPARATION_STEER,
  ROAMER_BUTTERFLY_SIM_STEP_MS,
} from '../config/butterflySimConfig';
import { lerpAngle } from './butterflySimHelpers';
import { updateButterfly } from './updateButterfly';

const SEPARATION_RADIUS_SQ = ROAMER_BUTTERFLY_SEPARATION_RADIUS * ROAMER_BUTTERFLY_SEPARATION_RADIUS;
const SEPARATION_MIN_DIST_SQ = 0.25;

export function useButterflySimFrameLoop(
  runtimes: ButterflyRuntimeEntry[],
  swimZone: SwimZone,
  sharedPositions: SharedValue<number[]>,
): void {
  const lastTimestamp = useSharedValue(-1);
  const butterflyCount = runtimes.length;

  const steerMinX = swimZone.x + swimZone.w * ROAMER_BUTTERFLY_BOUNDARY_MARGIN_RATIO;
  const steerMaxX = swimZone.x + swimZone.w * (1 - ROAMER_BUTTERFLY_BOUNDARY_MARGIN_RATIO);
  const steerMinY = swimZone.y + swimZone.h * ROAMER_BUTTERFLY_BOUNDARY_MARGIN_RATIO;
  const steerMaxY = swimZone.y + swimZone.h * (1 - ROAMER_BUTTERFLY_BOUNDARY_MARGIN_RATIO);
  const hardMinX = swimZone.x + ROAMER_BUTTERFLY_BOUNDARY_MARGIN;
  const hardMaxX = swimZone.x + swimZone.w - ROAMER_BUTTERFLY_BOUNDARY_MARGIN;
  const hardMinY = swimZone.y + ROAMER_BUTTERFLY_BOUNDARY_MARGIN;
  const hardMaxY = swimZone.y + swimZone.h - ROAMER_BUTTERFLY_BOUNDARY_MARGIN;
  const centerX = swimZone.x + swimZone.w * 0.5;
  const centerY = swimZone.y + swimZone.h * 0.5;

  const onSimFrame = useCallback(
    (frameInfo: { timestamp: number }) => {
      'worklet';
      if (lastTimestamp.value < 0) {
        lastTimestamp.value = frameInfo.timestamp;
        return;
      }

      const elapsed = frameInfo.timestamp - lastTimestamp.value;
      if (elapsed < ROAMER_BUTTERFLY_SIM_STEP_MS) {
        return;
      }
      const dt = Math.min(elapsed / 1000, 0.05);
      lastTimestamp.value = frameInfo.timestamp;

      const pos = sharedPositions.value;

      for (let i = 0; i < butterflyCount; i++) {
        const runtime = runtimes[i]!.runtime;

        updateButterfly(
          runtime,
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
        );

        if (runtime.state.value === FlightState.FLYING_CRUISE) {
          const fx = runtime.x.value;
          const fy = runtime.y.value;

          for (let j = 0; j < butterflyCount; j++) {
            if (j === i) {
              continue;
            }
            const other = runtimes[j]!.runtime;
            const dx = fx - other.x.value;
            const dy = fy - other.y.value;
            const distSq = dx * dx + dy * dy;
            if (distSq < SEPARATION_RADIUS_SQ && distSq > SEPARATION_MIN_DIST_SQ) {
              const dist = Math.sqrt(distSq);
              const overlap = 1 - dist / ROAMER_BUTTERFLY_SEPARATION_RADIUS;
              const awayAngle = Math.atan2(dy, dx);
              const str = Math.min(1, overlap * ROAMER_BUTTERFLY_SEPARATION_STEER * dt);
              runtime.angle.value = lerpAngle(runtime.angle.value, awayAngle, str);
              runtime.wanderAngle.value = lerpAngle(runtime.wanderAngle.value, awayAngle, str);
            }
          }
        }

        pos[i * 2] = runtime.x.value;
        pos[i * 2 + 1] = runtime.y.value;
      }

      sharedPositions.value = pos;
    },
    [
      lastTimestamp,
      sharedPositions,
      butterflyCount,
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
