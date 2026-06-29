import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useImage } from '@shopify/react-native-skia';
import { releaseCapturedFishWorklet } from './fishPoolSnapshot';
import { KoiCapturedFishCanvas } from './KoiCapturedFishCanvas';
import { KoiFishLayer, SWIM_ZONE_TOP_RATIO, type KoiImageKey } from './KoiFishLayer';
import { KoiWordBubble } from './KoiWordBubble';
import { useBubbleAnimation } from './useBubbleAnimation';
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

export type KoiSwimZoneProps = {
  words: string[];
};

type ReleaseContext = {
  runtimeEntries: KoiRuntimeEntry[];
  sharedPositions: SharedValue<number[]>;
  captureState: KoiCaptureSharedState;
};

export function KoiSwimZone({ words }: KoiSwimZoneProps) {
  const { width, height } = useWindowDimensions();
  const [selection, setSelection] = useState<BubbleSelection | null>(null);
  /** Pool visibility — decoupled from overlay so canvases can overlap for one frame on enter/exit. */
  const [poolHiddenFishIndex, setPoolHiddenFishIndex] = useState<number | null>(null);
  const transitionRafRef = useRef<number | null>(null);
  const releaseRequestSv = useSharedValue(0);
  const releaseContextSv = useSharedValue<ReleaseContext | null>(null);
  const capturedFishIndexSv = useSharedValue(-1);
  const captureOriginXSv = useSharedValue(0);
  const captureOriginYSv = useSharedValue(0);

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

  const handleBurstEnd = useCallback(() => {
    cancelTransitionRaf();
    setPoolHiddenFishIndex(null);
    transitionRafRef.current = requestAnimationFrame(() => {
      transitionRafRef.current = null;
      setSelection(null);
    });
  }, [cancelTransitionRaf]);

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
    }),
    [anim, phase, enterProgress, capturedFishIndexSv, captureOriginXSv, captureOriginYSv],
  );

  const sim = useKoiFishSimulation({
    width,
    height,
    words,
    captureState,
    releaseRequestSv,
  });

  releaseContextSv.value = {
    runtimeEntries: sim.runtimeEntries,
    sharedPositions: sim.sharedPositions,
    captureState,
  };

  const handleFishSelect = useCallback(
    (word: string, fishIndex: number, originX: number, originY: number) => {
      cancelTransitionRaf();
      sim.armCapture(fishIndex, originX, originY);
      setPoolHiddenFishIndex(null);
      setSelection({ word, fishIndex, originX, originY });
      transitionRafRef.current = requestAnimationFrame(() => {
        transitionRafRef.current = null;
        setPoolHiddenFishIndex(fishIndex);
      });
    },
    [cancelTransitionRaf, sim],
  );

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

  const capturedEntry =
    selection != null ? sim.runtimeEntries[selection.fishIndex] : null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <KoiFishLayer
        sim={sim}
        images={images as Record<KoiImageKey, NonNullable<typeof koi1>>}
        masks={masks as Record<KoiImageKey, NonNullable<typeof koi1Mask>>}
        capturedFishIndex={poolHiddenFishIndex}
        interactive={selection === null}
        onFishSelect={handleFishSelect}
      />
      {selection != null && capturedEntry != null && (
        <KoiWordBubble
          word={selection.word}
          anim={anim}
          phase={phase}
          startBurst={startBurst}
          capturedFish={
            <KoiCapturedFishCanvas
              entry={capturedEntry}
              anim={anim}
              image={images[capturedEntry.spawn.imageKey]!}
              maskImage={masks[capturedEntry.spawn.imageKey]!}
              overlayMaskImage={masks[capturedEntry.spawn.overlayMaskKey]!}
              renderProps={sim.renderProps}
            />
          }
        />
      )}
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
    overflow: 'hidden',
  },
});
