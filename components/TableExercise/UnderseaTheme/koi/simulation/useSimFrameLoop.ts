import { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { KOI_FISH_BODY_INSET } from '../config/koiInstanceConfig';
import {
  KOI_BASE_SPEED_MAX,
  KOI_BOUNDARY_MARGIN_RATIO,
  KOI_FISH_STATE_SWIMMING,
  KOI_SEPARATION_MIN_DIST_SQ,
  KOI_SEPARATION_RADIUS,
  KOI_SEPARATION_STEER,
  KOI_SIM_STEP_MS,
} from '../config/koiSimConfig';
import {
  advanceFishCosmetics,
  applyEnterFishPosition,
  updateFishDirectedEscape,
  updateFishInBubble,
} from '../koiBubbleSim';
import { releaseCapturedFishWorklet } from '../fishPoolSnapshot';
import { BubblePhase } from '../bubbles/useBubbleAnimation';
import type { KoiRuntimeEntry, SwimZone } from './types';
import type { KoiCaptureSharedState } from './captureTypes';
import {
  fishCrossedExitComplete,
  fishCrossedExitDismiss,
  isFishEliminated,
  lerpAngle,
  updateFish,
} from './koiSimWorklets';

export function useSimFrameLoop(
  runtimes: KoiRuntimeEntry[],
  swimZone: SwimZone,
  screenWidth: number,
  screenHeight: number,
  sharedPositions: SharedValue<number[]>,
  captureState: KoiCaptureSharedState,
  releaseRequestSv: SharedValue<number>,
  eliminatedFishSv: SharedValue<number[]>,
  onEscapeOverlayDismiss: () => void,
  onEscapeComplete: () => void,
  onSpeedIncrease?: () => void,
): void {
  const lastTimestamp = useSharedValue(-1);
  const fishCount = runtimes.length;

  const steerMinX = swimZone.x + swimZone.w * KOI_BOUNDARY_MARGIN_RATIO;
  const steerMaxX = swimZone.x + swimZone.w * (1 - KOI_BOUNDARY_MARGIN_RATIO);
  const steerMinY = swimZone.y + swimZone.h * KOI_BOUNDARY_MARGIN_RATIO;
  const steerMaxY = swimZone.y + swimZone.h * (1 - KOI_BOUNDARY_MARGIN_RATIO);
  const hardMinX = swimZone.x + KOI_FISH_BODY_INSET;
  const hardMaxX = swimZone.x + swimZone.w - KOI_FISH_BODY_INSET;
  const hardMinY = swimZone.y + KOI_FISH_BODY_INSET;
  const hardMaxY = swimZone.y + swimZone.h - KOI_FISH_BODY_INSET;
  const centerX = swimZone.x + swimZone.w * 0.5;
  const centerY = swimZone.y + swimZone.h * 0.5;

  const cellSize = KOI_SEPARATION_RADIUS;
  const gridCols = Math.max(1, Math.ceil(swimZone.w / cellSize));
  const gridRows = Math.max(1, Math.ceil(swimZone.h / cellSize));
  const gridMinX = swimZone.x;
  const gridMinY = swimZone.y;
  const cellCount = gridCols * gridRows;

  const cellHead = useSharedValue<number[]>([]);
  const fishNext = useSharedValue<number[]>([]);

  useEffect(() => {
    cellHead.value = new Array(cellCount).fill(-1);
    fishNext.value = new Array(fishCount).fill(-1);
  }, [cellCount, fishCount, cellHead, fishNext]);

  const onSimFrame = useCallback(
    (frameInfo: { timestamp: number }) => {
      'worklet';
      if (lastTimestamp.value < 0) {
        lastTimestamp.value = frameInfo.timestamp;
        return;
      }

      const elapsed = frameInfo.timestamp - lastTimestamp.value;
      if (elapsed < KOI_SIM_STEP_MS) {
        return;
      }
      const dt = Math.min(elapsed / 1000, 0.05);
      lastTimestamp.value = frameInfo.timestamp;

      const pos = sharedPositions.value;

      if (releaseRequestSv.value === 1) {
        releaseRequestSv.value = 0;
        const fishIndex = captureState.capturedFishIndex.value;
        const entry = fishIndex >= 0 ? runtimes[fishIndex] : null;
        if (entry != null) {
          releaseCapturedFishWorklet(
            fishIndex,
            entry.runtime,
            sharedPositions,
            captureState,
          );
        }
      }

      const heads = cellHead.value;
      const next = fishNext.value;
      const gridReady = heads.length === cellCount && next.length === fishCount;
      const capturedFishIndex = captureState.capturedFishIndex.value;
      const eliminated = eliminatedFishSv.value;

      if (gridReady) {
        for (let c = 0; c < cellCount; c++) {
          heads[c] = -1;
        }
        for (let i = 0; i < fishCount; i++) {
          if (i === capturedFishIndex || isFishEliminated(eliminated, i)) {
            continue;
          }
          let cx = Math.floor((pos[i * 2] - gridMinX) / cellSize);
          let cy = Math.floor((pos[i * 2 + 1] - gridMinY) / cellSize);
          if (cx < 0) { cx = 0; } else if (cx >= gridCols) { cx = gridCols - 1; }
          if (cy < 0) { cy = 0; } else if (cy >= gridRows) { cy = gridRows - 1; }
          const cell = cy * gridCols + cx;
          next[i] = heads[cell];
          heads[cell] = i;
        }
      }

      for (let fishIndex = 0; fishIndex < fishCount; fishIndex++) {
        const fishRuntime = runtimes[fishIndex].runtime;

        if (isFishEliminated(eliminated, fishIndex)) {
          continue;
        }

        if (fishIndex === capturedFishIndex && capturedFishIndex >= 0) {
          if (captureState.escapeActive.value) {
            const arrived = updateFishDirectedEscape(
              fishRuntime,
              dt,
              captureState.escapeTargetX.value,
              captureState.escapeTargetY.value,
              KOI_BASE_SPEED_MAX,
              KOI_FISH_BODY_INSET,
              screenWidth,
              screenHeight,
              captureState.escapeExitEdge.value,
            );

            if (captureState.escapeStage.value === 0 && arrived) {
              captureState.escapeStage.value = 1;
              captureState.escapeTargetX.value = captureState.offScreenTargetX.value;
              captureState.escapeTargetY.value = captureState.offScreenTargetY.value;
            }

            const exitEdge = captureState.escapeExitEdge.value;
            if (
              captureState.escapeStage.value === 1 &&
              fishCrossedExitDismiss(fishRuntime, exitEdge, screenWidth, screenHeight) &&
              !captureState.escapeOverlayDismissTriggered.value
            ) {
              captureState.escapeOverlayDismissTriggered.value = true;
              scheduleOnRN(onEscapeOverlayDismiss);
            }

            if (
              captureState.escapeStage.value === 1 &&
              fishCrossedExitComplete(
                fishRuntime,
                exitEdge,
                KOI_FISH_BODY_INSET,
                screenWidth,
                screenHeight,
              ) &&
              !captureState.escapeCompleteTriggered.value
            ) {
              captureState.escapeCompleteTriggered.value = true;
              scheduleOnRN(onEscapeComplete);
            }

            pos[fishIndex * 2] = fishRuntime.x.value;
            pos[fishIndex * 2 + 1] = fishRuntime.y.value;
            continue;
          }

          const bubblePhase = captureState.bubblePhase.value;
          const bubble = captureState.bubbleAnim.value;
          const bubbleCenterX = bubble.centerX;
          const bubbleCenterY = bubble.centerY;
          const bubbleRadius = bubble.diameter * 0.5;

          if (bubblePhase === BubblePhase.Enter) {
            applyEnterFishPosition(
              fishRuntime,
              captureState.captureOriginX.value,
              captureState.captureOriginY.value,
              bubbleCenterX,
              bubbleCenterY,
              captureState.enterProgress.value,
            );
            advanceFishCosmetics(fishRuntime, dt);
          } else if (
            bubblePhase === BubblePhase.Idle ||
            bubblePhase === BubblePhase.Burst
          ) {
            updateFishInBubble(
              fishRuntime,
              dt,
              bubbleCenterX,
              bubbleCenterY,
              bubbleRadius,
              KOI_FISH_BODY_INSET,
            );
          }

          pos[fishIndex * 2] = fishRuntime.x.value;
          pos[fishIndex * 2 + 1] = fishRuntime.y.value;
          continue;
        }

        updateFish(
          fishRuntime,
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
          onSpeedIncrease,
        );

        if (fishRuntime.state.value === KOI_FISH_STATE_SWIMMING) {
          const fx = fishRuntime.x.value;
          const fy = fishRuntime.y.value;

          if (gridReady) {
            let cx = Math.floor((fx - gridMinX) / cellSize);
            let cy = Math.floor((fy - gridMinY) / cellSize);
            if (cx < 0) { cx = 0; } else if (cx >= gridCols) { cx = gridCols - 1; }
            if (cy < 0) { cy = 0; } else if (cy >= gridRows) { cy = gridRows - 1; }

            for (let gy = cy - 1; gy <= cy + 1; gy++) {
              if (gy < 0 || gy >= gridRows) {
                continue;
              }
              for (let gx = cx - 1; gx <= cx + 1; gx++) {
                if (gx < 0 || gx >= gridCols) {
                  continue;
                }
                let i = heads[gy * gridCols + gx];
                while (i !== -1) {
                  if (i !== fishIndex && i !== capturedFishIndex && !isFishEliminated(eliminated, i)) {
                    const dx = fx - pos[i * 2];
                    const dy = fy - pos[i * 2 + 1];
                    const distSq = dx * dx + dy * dy;
                    if (distSq < KOI_SEPARATION_RADIUS * KOI_SEPARATION_RADIUS && distSq > KOI_SEPARATION_MIN_DIST_SQ) {
                      const dist = Math.sqrt(distSq);
                      const overlap = 1 - dist / KOI_SEPARATION_RADIUS;
                      const awayAngle = Math.atan2(dy, dx);
                      const str = Math.min(1, overlap * KOI_SEPARATION_STEER * dt);
                      fishRuntime.angle.value = lerpAngle(fishRuntime.angle.value, awayAngle, str);
                      fishRuntime.wanderAngle.value = lerpAngle(
                        fishRuntime.wanderAngle.value,
                        awayAngle,
                        str,
                      );
                    }
                  }
                  i = next[i];
                }
              }
            }
          } else {
            for (let i = 0; i < fishCount; i++) {
              if (i === fishIndex || i === capturedFishIndex || isFishEliminated(eliminated, i)) {
                continue;
              }
              const dx = fx - pos[i * 2];
              const dy = fy - pos[i * 2 + 1];
              const distSq = dx * dx + dy * dy;
              if (distSq < KOI_SEPARATION_RADIUS * KOI_SEPARATION_RADIUS && distSq > KOI_SEPARATION_MIN_DIST_SQ) {
                const dist = Math.sqrt(distSq);
                const overlap = 1 - dist / KOI_SEPARATION_RADIUS;
                const awayAngle = Math.atan2(dy, dx);
                const str = Math.min(1, overlap * KOI_SEPARATION_STEER * dt);
                fishRuntime.angle.value = lerpAngle(fishRuntime.angle.value, awayAngle, str);
                fishRuntime.wanderAngle.value = lerpAngle(fishRuntime.wanderAngle.value, awayAngle, str);
              }
            }
          }
        }

        pos[fishIndex * 2] = fishRuntime.x.value;
        pos[fishIndex * 2 + 1] = fishRuntime.y.value;
      }

      sharedPositions.value = pos;
    },
    [
      lastTimestamp,
      sharedPositions,
      cellHead,
      fishNext,
      cellCount,
      fishCount,
      captureState,
      releaseRequestSv,
      eliminatedFishSv,
      onEscapeOverlayDismiss,
      onEscapeComplete,
      screenWidth,
      screenHeight,
      gridMinX,
      gridMinY,
      cellSize,
      gridCols,
      gridRows,
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
      onSpeedIncrease,
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
