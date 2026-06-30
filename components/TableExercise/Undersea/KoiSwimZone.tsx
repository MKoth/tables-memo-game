import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useImage } from '@shopify/react-native-skia';
import { releaseCapturedFishWorklet } from './fishPoolSnapshot';
import { KoiCapturedFishCanvas } from './KoiCapturedFishCanvas';
import { KoiFishLayer, SWIM_ZONE_TOP_RATIO, type KoiImageKey } from './KoiFishLayer';
import { KoiWordBubble } from './KoiWordBubble';
import { BubblePhase, BurstIntent, useBubbleAnimation } from './useBubbleAnimation';
import {
  useKoiFishSimulation,
  type KoiCaptureSharedState,
  type KoiRuntimeEntry,
} from './useKoiFishSimulation';

const KOI_VARIANTS = {
  koi1: require('../../../assets/koi1.png'),
  koi2: require('../../../assets/koi2.png'),
  koi3: require('../../../assets/koi3.png'),
} as const;

const KOI_MASK_VARIANTS = {
  koi1: require('../../../assets/koi1-mask.png'),
  koi2: require('../../../assets/koi2-mask.png'),
  koi3: require('../../../assets/koi3-mask.png'),
} as const;

const BUBBLE_DIAMETER_RATIO = 0.9;

type BubbleSelection = {
  word: string;
  fishIndex: number;
  originX: number;
  originY: number;
};

export type KoiCaptureBridge = {
  capturedWord: string | null;
  bubblePhase: SharedValue<number>;
  onMatchSuccess: (targetX: number, targetY: number, hitIdx: number) => void;
  overlay: React.ReactNode | null;
  escapeOverlayActive: boolean;
};

export type KoiSwimZoneProps = {
  words: string[];
  onCaptureBridgeChange?: (bridge: KoiCaptureBridge | null) => void;
};

type ReleaseContext = {
  runtimeEntries: KoiRuntimeEntry[];
  sharedPositions: SharedValue<number[]>;
  captureState: KoiCaptureSharedState;
};

export function KoiSwimZone({ words, onCaptureBridgeChange }: KoiSwimZoneProps) {
  const { width, height } = useWindowDimensions();
  const [selection, setSelection] = useState<BubbleSelection | null>(null);
  const [eliminatedFishIndices, setEliminatedFishIndices] = useState<number[]>([]);
  const [escapeOverlayActive, setEscapeOverlayActive] = useState(false);
  /** Pool visibility — decoupled from overlay so canvases can overlap for one frame on enter/exit. */
  const [poolHiddenFishIndex, setPoolHiddenFishIndex] = useState<number | null>(null);
  const transitionRafRef = useRef<number | null>(null);
  const releaseRequestSv = useSharedValue(0);
  const releaseContextSv = useSharedValue<ReleaseContext | null>(null);
  const capturedFishIndexSv = useSharedValue(-1);
  const captureOriginXSv = useSharedValue(0);
  const captureOriginYSv = useSharedValue(0);
  const escapeActiveSv = useSharedValue(false);
  const escapeStageSv = useSharedValue(0);
  const escapeTargetXSv = useSharedValue(0);
  const escapeTargetYSv = useSharedValue(0);
  const offScreenTargetXSv = useSharedValue(width * 0.5);
  const offScreenTargetYSv = useSharedValue(-120 * 1.5);
  const escapeCompleteTriggeredSv = useSharedValue(false);
  const escapeOverlayDismissTriggeredSv = useSharedValue(false);
  const eliminatedFishSv = useSharedValue<number[]>([]);

  const koi1 = useImage(KOI_VARIANTS.koi1);
  const koi2 = useImage(KOI_VARIANTS.koi2);
  const koi3 = useImage(KOI_VARIANTS.koi3);
  const koi1Mask = useImage(KOI_MASK_VARIANTS.koi1);
  const koi2Mask = useImage(KOI_MASK_VARIANTS.koi2);
  const koi3Mask = useImage(KOI_MASK_VARIANTS.koi3);

  const images = useMemo(
    () => ({ koi1, koi2, koi3 }),
    [koi1, koi2, koi3],
  );
  const masks = useMemo(
    () => ({ koi1: koi1Mask, koi2: koi2Mask, koi3: koi3Mask }),
    [koi1Mask, koi2Mask, koi3Mask],
  );

  useEffect(() => {
    eliminatedFishSv.value = eliminatedFishIndices;
  }, [eliminatedFishIndices, eliminatedFishSv]);

  useEffect(() => {
    offScreenTargetXSv.value = width * 0.5;
    offScreenTargetYSv.value = -120 * 1.5;
  }, [width, offScreenTargetXSv, offScreenTargetYSv]);

  const targetDiameter = width * BUBBLE_DIAMETER_RATIO;
  const swimZoneHeight = height * (1 - SWIM_ZONE_TOP_RATIO);
  const targetCenterX = width * 0.5;
  const targetCenterY = height * SWIM_ZONE_TOP_RATIO + swimZoneHeight * 0.5;

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

  const { anim, phase, enterProgress, startBurst } = useBubbleAnimation(
    bubbleConfig,
    handleBurstEnd,
    selection != null,
    requestReleaseWorklet,
  );

  const captureState = useMemo(
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
      escapeCompleteTriggeredSv,
      escapeOverlayDismissTriggeredSv,
    ],
  );

  const onEscapeOverlayDismissRef = useRef<() => void>(() => {});
  const onEscapeCompleteRef = useRef<() => void>(() => {});

  const sim = useKoiFishSimulation({
    width,
    height,
    words,
    captureState,
    releaseRequestSv,
    eliminatedFishSv,
    onEscapeOverlayDismiss: () => onEscapeOverlayDismissRef.current(),
    onEscapeComplete: () => onEscapeCompleteRef.current(),
  });

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
      setEliminatedFishIndices(prev =>
        prev.includes(fishIndex) ? prev : [...prev, fishIndex],
      );
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
    [cancelTransitionRaf, escapeActiveSv, escapeCompleteTriggeredSv, escapeOverlayDismissTriggeredSv, escapeStageSv, sim],
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

  if (
    words.length === 0 ||
    !koi1 ||
    !koi2 ||
    !koi3 ||
    !koi1Mask ||
    !koi2Mask ||
    !koi3Mask ||
    width === 0 ||
    height === 0
  ) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <KoiFishLayer
        sim={sim}
        images={images as Record<KoiImageKey, NonNullable<typeof koi1>>}
        masks={masks as Record<KoiImageKey, NonNullable<typeof koi1Mask>>}
        capturedFishIndex={poolHiddenFishIndex}
        eliminatedFishSv={eliminatedFishSv}
        eliminatedFishIndices={eliminatedFishIndices}
        interactive={selection === null}
        onFishSelect={handleFishSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'visible',
  },
});
