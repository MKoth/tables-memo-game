import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import {
  computeOffScreenEscapeTarget,
  escapeExitEdgeCode,
  type ZoneRect,
  type UnderseaThemeOrientation,
} from '../../../core/layout/computeUnderseaThemeLayout';
import type { UnderseaThemeSoundController } from '../../../core/assets/useUnderseaThemeSounds';
import type { KoiSimBridge } from '../../../core/types/tutorialTypes';
import { releaseCapturedFishWorklet } from '../../fishPoolSnapshot';
import { KoiCapturedFishCanvas } from '../../KoiCapturedFishCanvas';
import { KoiWordBubble } from '../../KoiWordBubble';
import {
  BubblePhase,
  BurstIntent,
  useBubbleAnimation,
  type BurstIntentValue,
} from '../../useBubbleAnimation';
import {
  useKoiFishSimulation,
  type KoiCaptureSharedState,
} from '../../simulation/useKoiFishSimulation';
import { BUBBLE_DIAMETER_RATIO, type BubbleSelection, type KoiCaptureBridge } from '../types';

type UseKoiCaptureFlowParams = {
  words: string[];
  width: number;
  height: number;
  koiRect: ZoneRect;
  orientation: UnderseaThemeOrientation;
  layoutKey: string;
  images: Record<'koi1' | 'koi2' | 'koi3', SkImage>;
  masks: Record<'koi1' | 'koi2' | 'koi3', SkImage>;
  sounds?: UnderseaThemeSoundController;
  onCaptureBridgeChange?: (bridge: KoiCaptureBridge | null) => void;
  onSimBridgeChange?: (bridge: KoiSimBridge | null) => void;
};

export function useKoiCaptureFlow({
  words,
  width,
  height,
  koiRect,
  orientation,
  layoutKey,
  images,
  masks,
  sounds,
  onCaptureBridgeChange,
  onSimBridgeChange,
}: UseKoiCaptureFlowParams) {
  const [selection, setSelection] = useState<BubbleSelection | null>(null);
  const [eliminatedFishIndices, setEliminatedFishIndices] = useState<number[]>([]);
  const [escapeOverlayActive, setEscapeOverlayActive] = useState(false);
  const [poolHiddenFishIndex, setPoolHiddenFishIndex] = useState<number | null>(null);
  const transitionRafRef = useRef<number | null>(null);
  const releaseRequestSv = useSharedValue(0);
  const releaseContextSv = useSharedValue<{
    runtimeEntries: ReturnType<typeof useKoiFishSimulation>['runtimeEntries'];
    sharedPositions: ReturnType<typeof useKoiFishSimulation>['sharedPositions'];
    captureState: KoiCaptureSharedState;
  } | null>(null);
  const capturedFishIndexSv = useSharedValue(-1);
  const captureOriginXSv = useSharedValue(0);
  const captureOriginYSv = useSharedValue(0);
  const escapeActiveSv = useSharedValue(false);
  const escapeStageSv = useSharedValue(0);
  const escapeTargetXSv = useSharedValue(0);
  const escapeTargetYSv = useSharedValue(0);
  const offScreenTargetXSv = useSharedValue(width * 0.5);
  const offScreenTargetYSv = useSharedValue(-120 * 1.5);
  const escapeExitEdgeSv = useSharedValue(0);
  const escapeCompleteTriggeredSv = useSharedValue(false);
  const escapeOverlayDismissTriggeredSv = useSharedValue(false);
  const eliminatedFishSv = useSharedValue<number[]>([]);
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;
  const fishCountRef = useRef(0);
  const onEscapeOverlayDismissRef = useRef<() => void>(() => {});
  const onEscapeCompleteRef = useRef<() => void>(() => {});

  const onSpeedIncrease = useCallback(() => {
    soundsRef.current?.playRandomSplash();
  }, []);

  useEffect(() => {
    eliminatedFishSv.value = eliminatedFishIndices;
  }, [eliminatedFishIndices, eliminatedFishSv]);

  const targetDiameter =
    Math.min(koiRect.w, koiRect.h) * BUBBLE_DIAMETER_RATIO;
  const targetCenterX = koiRect.x + koiRect.w * 0.5;
  const targetCenterY = koiRect.y + koiRect.h * 0.5;

  const bubbleConfig = useMemo(
    () => ({
      originX: selection?.originX ?? 0,
      originY: selection?.originY ?? 0,
      targetCenterX,
      targetCenterY,
      targetDiameter,
    }),
    [selection?.originX, selection?.originY, targetCenterX, targetCenterY, targetDiameter],
  );

  const cancelTransitionRaf = useCallback(() => {
    if (transitionRafRef.current != null) {
      cancelAnimationFrame(transitionRafRef.current);
      transitionRafRef.current = null;
    }
  }, []);

  useEffect(() => () => cancelTransitionRaf(), [cancelTransitionRaf]);

  const handleBurstEnd = useCallback(
    (intent: number) => {
      if (intent === BurstIntent.Escape) {
        return;
      }

      cancelTransitionRaf();
      setPoolHiddenFishIndex(null);
      transitionRafRef.current = requestAnimationFrame(() => {
        transitionRafRef.current = null;
        setSelection(null);
      });
    },
    [cancelTransitionRaf],
  );

  const requestReleaseWorklet = useCallback(() => {
    'worklet';
    const ctx = releaseContextSv.value;
    if (ctx == null) {
      releaseRequestSv.value = 1;
      return;
    }

    const fishIndex = ctx.captureState.capturedFishIndex.value;
    const entry = fishIndex >= 0 ? ctx.runtimeEntries[fishIndex] : null;
    if (entry != null) {
      releaseCapturedFishWorklet(
        fishIndex,
        entry.runtime,
        ctx.sharedPositions,
        ctx.captureState,
      );
    }
  }, [releaseContextSv, releaseRequestSv]);

  const { anim, phase, enterProgress, startBurst: startBurstRaw } = useBubbleAnimation(
    bubbleConfig,
    handleBurstEnd,
    selection != null,
    requestReleaseWorklet,
  );

  const startBurst = useCallback(
    (intent: BurstIntentValue = BurstIntent.Release) => {
      soundsRef.current?.playBubblePop();
      startBurstRaw(intent);
    },
    [startBurstRaw],
  );

  const captureState = useMemo<KoiCaptureSharedState>(
    () => ({
      capturedFishIndex: capturedFishIndexSv,
      captureOriginX: captureOriginXSv,
      captureOriginY: captureOriginYSv,
      bubbleAnim: anim,
      bubblePhase: phase,
      enterProgress,
      escapeActive: escapeActiveSv,
      escapeStage: escapeStageSv,
      escapeTargetX: escapeTargetXSv,
      escapeTargetY: escapeTargetYSv,
      offScreenTargetX: offScreenTargetXSv,
      offScreenTargetY: offScreenTargetYSv,
      escapeExitEdge: escapeExitEdgeSv,
      escapeCompleteTriggered: escapeCompleteTriggeredSv,
      escapeOverlayDismissTriggered: escapeOverlayDismissTriggeredSv,
    }),
    [
      anim,
      phase,
      enterProgress,
      capturedFishIndexSv,
      captureOriginXSv,
      captureOriginYSv,
      escapeActiveSv,
      escapeStageSv,
      escapeTargetXSv,
      escapeTargetYSv,
      offScreenTargetXSv,
      offScreenTargetYSv,
      escapeExitEdgeSv,
      escapeCompleteTriggeredSv,
      escapeOverlayDismissTriggeredSv,
    ],
  );

  const sim = useKoiFishSimulation({
    width,
    height,
    koiRect,
    layoutKey,
    words,
    captureState,
    releaseRequestSv,
    eliminatedFishSv,
    onEscapeOverlayDismiss: () => onEscapeOverlayDismissRef.current(),
    onEscapeComplete: () => onEscapeCompleteRef.current(),
    onSpeedIncrease,
  });
  fishCountRef.current = sim.runtimeEntries.length;

  const handleEscapeOverlayDismiss = useCallback(() => {
    setSelection(null);
    setEscapeOverlayActive(false);
  }, []);

  const handleEscapeComplete = useCallback(() => {
    const fishIndex = capturedFishIndexSv.value;
    cancelTransitionRaf();
    escapeActiveSv.value = false;
    escapeStageSv.value = 0;
    escapeCompleteTriggeredSv.value = false;
    escapeOverlayDismissTriggeredSv.value = false;
    capturedFishIndexSv.value = -1;
    phase.value = BubblePhase.None;

    if (fishIndex >= 0) {
      setEliminatedFishIndices(prev => {
        const next = prev.includes(fishIndex) ? prev : [...prev, fishIndex];
        if (next.length === fishCountRef.current) {
          soundsRef.current?.playFanfare();
        }
        return next;
      });
    }

    setPoolHiddenFishIndex(null);
    setEscapeOverlayActive(false);
    setSelection(null);
  }, [
    cancelTransitionRaf,
    capturedFishIndexSv,
    escapeActiveSv,
    escapeStageSv,
    escapeCompleteTriggeredSv,
    escapeOverlayDismissTriggeredSv,
    phase,
  ]);

  onEscapeOverlayDismissRef.current = handleEscapeOverlayDismiss;
  onEscapeCompleteRef.current = handleEscapeComplete;

  useLayoutEffect(() => {
    const escape = computeOffScreenEscapeTarget(
      koiRect,
      width,
      height,
      orientation,
    );
    offScreenTargetXSv.value = escape.x;
    offScreenTargetYSv.value = escape.y;
    escapeExitEdgeSv.value = escapeExitEdgeCode(escape.exitEdge);

    if (!escapeActiveSv.value) {
      return;
    }

    const bubblePhase = phase.value;
    if (escapeStageSv.value === 1 || bubblePhase === BubblePhase.Burst) {
      escapeTargetXSv.value = escape.x;
      escapeTargetYSv.value = escape.y;
      if (bubblePhase === BubblePhase.Burst) {
        escapeStageSv.value = 1;
      }
      escapeCompleteTriggeredSv.value = false;
      escapeOverlayDismissTriggeredSv.value = false;
      return;
    }

    escapeTargetXSv.value = targetCenterX;
    escapeTargetYSv.value = targetCenterY;
  }, [
    escapeActiveSv,
    escapeCompleteTriggeredSv,
    escapeOverlayDismissTriggeredSv,
    escapeExitEdgeSv,
    escapeStageSv,
    escapeTargetXSv,
    escapeTargetYSv,
    koiRect,
    layoutKey,
    offScreenTargetXSv,
    offScreenTargetYSv,
    orientation,
    phase,
    targetCenterX,
    targetCenterY,
    width,
    height,
  ]);

  useLayoutEffect(() => {
    if (selection == null) {
      return;
    }
    const fishIndex = selection.fishIndex;
    const entry = sim.runtimeEntries[fishIndex];
    if (entry == null) {
      return;
    }
    const bubblePhase = phase.value;
    if (
      bubblePhase === BubblePhase.Idle ||
      bubblePhase === BubblePhase.Burst ||
      escapeActiveSv.value
    ) {
      entry.runtime.x.value = targetCenterX;
      entry.runtime.y.value = targetCenterY;
      const pos = sim.sharedPositions.value.slice();
      pos[fishIndex * 2] = targetCenterX;
      pos[fishIndex * 2 + 1] = targetCenterY;
      sim.sharedPositions.value = pos;
    }
  }, [
    layoutKey,
    targetCenterX,
    targetCenterY,
    selection,
    sim.runtimeEntries,
    sim.sharedPositions,
    phase,
    escapeActiveSv,
  ]);

  releaseContextSv.value = {
    runtimeEntries: sim.runtimeEntries,
    sharedPositions: sim.sharedPositions,
    captureState,
  };

  const handleMatchSuccess = useCallback(
    (targetX: number, targetY: number, _hitIdx: number) => {
      escapeTargetXSv.value = targetX;
      escapeTargetYSv.value = targetY;
      escapeStageSv.value = 0;
      escapeCompleteTriggeredSv.value = false;
      escapeOverlayDismissTriggeredSv.value = false;
      escapeActiveSv.value = true;
      setEscapeOverlayActive(true);
      startBurst(BurstIntent.Escape);
    },
    [
      escapeCompleteTriggeredSv,
      escapeOverlayDismissTriggeredSv,
      escapeActiveSv,
      escapeStageSv,
      escapeTargetXSv,
      escapeTargetYSv,
      startBurst,
    ],
  );

  const handleFishSelect = useCallback(
    (word: string, fishIndex: number, originX: number, originY: number) => {
      cancelTransitionRaf();
      soundsRef.current?.playBubbleInflate();
      sim.armCapture(fishIndex, originX, originY);
      setPoolHiddenFishIndex(null);
      setEscapeOverlayActive(false);
      escapeActiveSv.value = false;
      escapeStageSv.value = 0;
      escapeCompleteTriggeredSv.value = false;
      escapeOverlayDismissTriggeredSv.value = false;
      setSelection({ word, fishIndex, originX, originY });
      transitionRafRef.current = requestAnimationFrame(() => {
        transitionRafRef.current = null;
        setPoolHiddenFishIndex(fishIndex);
      });
    },
    [
      cancelTransitionRaf,
      escapeActiveSv,
      escapeCompleteTriggeredSv,
      escapeOverlayDismissTriggeredSv,
      escapeStageSv,
      sim,
    ],
  );

  const capturedEntry =
    selection != null ? sim.runtimeEntries[selection.fishIndex] : null;

  const capturedFishNode =
    capturedEntry != null ? (
      <KoiCapturedFishCanvas
        entry={capturedEntry}
        anim={anim}
        escapeActive={escapeActiveSv}
        image={images[capturedEntry.spawn.imageKey]!}
        maskImage={masks[capturedEntry.spawn.imageKey]!}
        overlayMaskImage={masks[capturedEntry.spawn.overlayMaskKey]!}
        renderProps={sim.renderProps}
      />
    ) : null;

  const bubbleOverlay =
    selection != null && capturedFishNode != null ? (
      <KoiWordBubble
        word={selection.word}
        anim={anim}
        phase={phase}
        escapeActive={escapeActiveSv}
        startBurst={startBurst}
        interactive={!escapeOverlayActive}
        capturedFish={capturedFishNode}
        targetDiameter={targetDiameter}
      />
    ) : null;

  const bubbleOverlayRef = useRef(bubbleOverlay);
  bubbleOverlayRef.current = bubbleOverlay;

  useLayoutEffect(() => {
    onCaptureBridgeChange?.(
      selection != null
        ? {
            capturedWord: selection.word,
            bubblePhase: phase,
            onMatchSuccess: handleMatchSuccess,
            overlay: bubbleOverlayRef.current,
            escapeOverlayActive,
          }
        : null,
    );
  }, [
    escapeOverlayActive,
    handleMatchSuccess,
    onCaptureBridgeChange,
    phase,
    selection,
  ]);

  useLayoutEffect(() => {
    onSimBridgeChange?.({
      fishRuntimePositions: sim.runtimeEntries.map(entry => ({
        x: entry.runtime.x,
        y: entry.runtime.y,
      })),
      fishCount: sim.runtimeEntries.length,
      hitRadius: sim.hitRadius,
      eliminatedFishSv,
    });
  }, [
    eliminatedFishSv,
    onSimBridgeChange,
    sim.hitRadius,
    sim.runtimeEntries,
  ]);

  return {
    sim,
    selection,
    poolHiddenFishIndex,
    eliminatedFishIndices,
    eliminatedFishSv,
    handleFishSelect,
  };
}
