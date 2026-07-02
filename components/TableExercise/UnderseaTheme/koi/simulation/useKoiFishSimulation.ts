import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { makeMutable, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { KOI_SETTINGS } from '../config/koiFishLayerConfig';
import type { ZoneRect } from '../../core/layout/computeUnderseaThemeLayout';
import {
  advanceFishCosmetics,
  applyEnterFishPosition,
  updateFishDirectedEscape,
  updateFishInBubble,
} from '../koiBubbleSim';
import { releaseCapturedFishWorklet } from '../fishPoolSnapshot';
import type { KoiRuntimeEntry, SwimZone } from './types';
import { BubblePhase, type BubbleAnimState } from '../useBubbleAnimation';
import { createFishRuntime, createSpawnsFromWords } from './createFishRuntime';
import {
  fishCrossedExitComplete,
  fishCrossedExitDismiss,
  isFishEliminated,
  lerpAngle,
  updateFish,
} from './koiSimWorklets';

const KOI_BASE_LENGTH = 120;
const KOI_BASE_THICKNESS = 38;
const FISH_BODY_INSET = (KOI_BASE_LENGTH * KOI_SETTINGS.scale) / 2;

const SWIMMING = 0;
const BASE_SPEED_MAX = 670;
const BOUNDARY_MARGIN_RATIO = 0.18;
const SEPARATION_RADIUS = 75;
const SEPARATION_STEER = 10.0;
const SIM_FPS = 30;
const SIM_STEP_MS = 1000 / SIM_FPS;

export type KoiCaptureSharedState = {
  capturedFishIndex: SharedValue<number>;
  captureOriginX: SharedValue<number>;
  captureOriginY: SharedValue<number>;
  bubbleAnim: SharedValue<BubbleAnimState>;
  bubblePhase: SharedValue<number>;
  enterProgress: SharedValue<number>;
  escapeActive: SharedValue<boolean>;
  escapeStage: SharedValue<number>;
  escapeTargetX: SharedValue<number>;
  escapeTargetY: SharedValue<number>;
  offScreenTargetX: SharedValue<number>;
  offScreenTargetY: SharedValue<number>;
  /** 0=top, 1=bottom, 2=left, 3=right */
  escapeExitEdge: SharedValue<number>;
  escapeCompleteTriggered: SharedValue<boolean>;
  escapeOverlayDismissTriggered: SharedValue<boolean>;
};

export type UseKoiFishSimulationParams = {
  width: number;
  height: number;
  koiRect: ZoneRect;
  layoutKey: string;
  words: string[];
  captureState: KoiCaptureSharedState;
  releaseRequestSv: SharedValue<number>;
  eliminatedFishSv: SharedValue<number[]>;
  onEscapeOverlayDismiss: () => void;
  onEscapeComplete: () => void;
  onSpeedIncrease?: () => void;
};

type PersistedSimBundle = {
  wordsKey: string;
  layoutKey: string;
  width: number;
  height: number;
  swimZone: SwimZone;
  runtimeEntries: KoiRuntimeEntry[];
  sharedPositions: SharedValue<number[]>;
};

function buildSimBundle(
  words: string[],
  width: number,
  height: number,
  koiRect: ZoneRect,
  layoutKey: string,
): PersistedSimBundle {
  const swimZone: SwimZone = {
    x: koiRect.x,
    y: koiRect.y,
    w: koiRect.w,
    h: koiRect.h,
  };
  const spawns = createSpawnsFromWords(words);
  const runtimeEntries = spawns.map((spawn) => ({
    spawn,
    runtime: createFishRuntime({ ...KOI_SETTINGS, ...spawn }, swimZone),
  }));
  const posArr = new Array(runtimeEntries.length * 2).fill(0);
  for (let i = 0; i < runtimeEntries.length; i++) {
    posArr[i * 2] = runtimeEntries[i]!.runtime.x.value;
    posArr[i * 2 + 1] = runtimeEntries[i]!.runtime.y.value;
  }

  return {
    wordsKey: words.join('\0'),
    layoutKey,
    width,
    height,
    swimZone,
    runtimeEntries,
    sharedPositions: makeMutable(posArr),
  };
}

function relayoutSimBundle(
  bundle: PersistedSimBundle,
  koiRect: ZoneRect,
  width: number,
  height: number,
  layoutKey: string,
  capturedFishIndex: number,
  eliminated: number[],
): void {
  const swimZone: SwimZone = {
    x: koiRect.x,
    y: koiRect.y,
    w: koiRect.w,
    h: koiRect.h,
  };
  const minX = swimZone.x + FISH_BODY_INSET;
  const maxX = swimZone.x + swimZone.w - FISH_BODY_INSET;
  const minY = swimZone.y + FISH_BODY_INSET;
  const maxY = swimZone.y + swimZone.h - FISH_BODY_INSET;

  const pos = bundle.sharedPositions.value.slice();
  for (let i = 0; i < bundle.runtimeEntries.length; i++) {
    if (i === capturedFishIndex || eliminated.includes(i)) {
      continue;
    }
    const fish = bundle.runtimeEntries[i]!.runtime;
    fish.x.value = Math.min(maxX, Math.max(minX, fish.x.value));
    fish.y.value = Math.min(maxY, Math.max(minY, fish.y.value));
    pos[i * 2] = fish.x.value;
    pos[i * 2 + 1] = fish.y.value;
  }

  bundle.sharedPositions.value = pos;
  bundle.swimZone = swimZone;
  bundle.width = width;
  bundle.height = height;
  bundle.layoutKey = layoutKey;
}

export type KoiFishSimulation = {
  runtimeEntries: KoiRuntimeEntry[];
  sharedPositions: SharedValue<number[]>;
  swimZone: SwimZone;
  armCapture: (fishIndex: number, originX: number, originY: number) => void;
  fishLength: number;
  fishThickness: number;
  swimZoneTop: number;
  swimZoneHeight: number;
  swimZoneLeft: number;
  swimZoneWidth: number;
  hitRadius: number;
  renderProps: {
    swimZoneX: number;
    swimZoneY: number;
    swimZoneW: number;
    swimZoneH: number;
    fishW: number;
    fishH: number;
    sourceAngle: number;
    tailFlex: {
      tailBendScale: number;
      tailTipBendScale: number;
      headBendScale: number;
    };
    turnDistort: {
      squashGain: number;
      bulgeGain: number;
    };
  };
};

function useFishSimulation(
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

  const steerMinX = swimZone.x + swimZone.w * BOUNDARY_MARGIN_RATIO;
  const steerMaxX = swimZone.x + swimZone.w * (1 - BOUNDARY_MARGIN_RATIO);
  const steerMinY = swimZone.y + swimZone.h * BOUNDARY_MARGIN_RATIO;
  const steerMaxY = swimZone.y + swimZone.h * (1 - BOUNDARY_MARGIN_RATIO);
  const hardMinX = swimZone.x + FISH_BODY_INSET;
  const hardMaxX = swimZone.x + swimZone.w - FISH_BODY_INSET;
  const hardMinY = swimZone.y + FISH_BODY_INSET;
  const hardMaxY = swimZone.y + swimZone.h - FISH_BODY_INSET;
  const centerX = swimZone.x + swimZone.w * 0.5;
  const centerY = swimZone.y + swimZone.h * 0.5;

  const cellSize = SEPARATION_RADIUS;
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
      if (elapsed < SIM_STEP_MS) {
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
              BASE_SPEED_MAX,
              FISH_BODY_INSET,
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
                FISH_BODY_INSET,
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
              FISH_BODY_INSET,
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

        if (fishRuntime.state.value === SWIMMING) {
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
                    if (distSq < SEPARATION_RADIUS * SEPARATION_RADIUS && distSq > 0.25) {
                      const dist = Math.sqrt(distSq);
                      const overlap = 1 - dist / SEPARATION_RADIUS;
                      const awayAngle = Math.atan2(dy, dx);
                      const str = Math.min(1, overlap * SEPARATION_STEER * dt);
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
              if (distSq < SEPARATION_RADIUS * SEPARATION_RADIUS && distSq > 0.25) {
                const dist = Math.sqrt(distSq);
                const overlap = 1 - dist / SEPARATION_RADIUS;
                const awayAngle = Math.atan2(dy, dx);
                const str = Math.min(1, overlap * SEPARATION_STEER * dt);
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

export function useKoiFishSimulation({
  width,
  height,
  koiRect,
  layoutKey,
  words,
  captureState,
  releaseRequestSv,
  eliminatedFishSv,
  onEscapeOverlayDismiss,
  onEscapeComplete,
  onSpeedIncrease,
}: UseKoiFishSimulationParams): KoiFishSimulation {
  const wordsKey = words.join('\0');
  const bundleRef = useRef<PersistedSimBundle | null>(null);

  if (bundleRef.current == null || bundleRef.current.wordsKey !== wordsKey) {
    bundleRef.current = buildSimBundle(words, width, height, koiRect, layoutKey);
  } else if (
    bundleRef.current.layoutKey !== layoutKey ||
    bundleRef.current.width !== width ||
    bundleRef.current.height !== height
  ) {
    relayoutSimBundle(
      bundleRef.current,
      koiRect,
      width,
      height,
      layoutKey,
      captureState.capturedFishIndex.value,
      eliminatedFishSv.value,
    );
  }

  const { runtimeEntries, sharedPositions, swimZone } = bundleRef.current;

  useFishSimulation(
    runtimeEntries,
    swimZone,
    width,
    height,
    sharedPositions,
    captureState,
    releaseRequestSv,
    eliminatedFishSv,
    onEscapeOverlayDismiss,
    onEscapeComplete,
    onSpeedIncrease,
  );

  const armCapture = useCallback(
    (fishIndex: number, originX: number, originY: number) => {
      captureState.capturedFishIndex.value = fishIndex;
      captureState.captureOriginX.value = originX;
      captureState.captureOriginY.value = originY;
    },
    [captureState],
  );

  const fishLength = KOI_BASE_LENGTH * KOI_SETTINGS.scale;
  const fishThickness = KOI_BASE_THICKNESS * KOI_SETTINGS.scale;
  const swimZoneTop = swimZone.y;
  const swimZoneHeight = swimZone.h;
  const swimZoneLeft = swimZone.x;
  const swimZoneWidth = swimZone.w;
  const hitRadius = fishLength * 0.55 * 1.55;

  const renderProps = useMemo(
    () => ({
      swimZoneX: swimZone.x,
      swimZoneY: swimZone.y,
      swimZoneW: swimZone.w,
      swimZoneH: swimZone.h,
      fishW: fishLength,
      fishH: fishThickness,
      sourceAngle: KOI_SETTINGS.sourceAngle,
      tailFlex: {
        tailBendScale: KOI_SETTINGS.tailBendScale,
        tailTipBendScale: KOI_SETTINGS.tailTipBendScale,
        headBendScale: KOI_SETTINGS.headBendScale,
      },
      turnDistort: {
        squashGain: KOI_SETTINGS.turnSquashGain,
        bulgeGain: KOI_SETTINGS.turnBulgeGain,
      },
    }),
    [swimZone, fishLength, fishThickness],
  );

  return {
    runtimeEntries,
    sharedPositions,
    swimZone,
    armCapture,
    fishLength,
    fishThickness,
    swimZoneTop,
    swimZoneHeight,
    swimZoneLeft,
    swimZoneWidth,
    hitRadius,
    renderProps,
  };
}

export type { FishRuntime, KoiRuntimeEntry, KoiSpawn } from './types';
