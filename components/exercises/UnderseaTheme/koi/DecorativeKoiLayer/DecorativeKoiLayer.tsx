import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useExerciseLayout } from '../../../core';
import { KoiFishLayer } from '../fish/KoiFishLayer';
import { useBubbleAnimation } from '../bubbles/useBubbleAnimation';
import { BUBBLE_DIAMETER_RATIO } from '../KoiSwimZone/types';
import { useKoiCaptureSharedState } from '../KoiSwimZone/hooks/useKoiCaptureSharedState';
import {
  useKoiFishSimulation,
  type KoiCaptureSharedState,
} from '../simulation/useKoiFishSimulation';

/** Decorative fish count for the sentence transformation exercise. */
export const DECORATIVE_KOI_COUNT = 8;

export type DecorativeKoiLayerProps = {
  zIndex?: number;
  fishCount?: number;
};

export function DecorativeKoiLayer({
  zIndex = 2,
  fishCount = DECORATIVE_KOI_COUNT,
}: DecorativeKoiLayerProps) {
  const { width, height } = useWindowDimensions();
  const layout = useExerciseLayout();
  const { images: assetImages } = useUnderseaThemeAssetsContext();
  const images = assetImages.koi;
  const masks = assetImages.koiMasks;

  const swimRect = useMemo(
    () => ({ x: 0, y: 0, w: width, h: height }),
    [width, height],
  );
  const words = useMemo(
    () => Array.from({ length: fishCount }, (_, index) => `__decorative_${index}`),
    [fishCount],
  );

  const shared = useKoiCaptureSharedState(width);
  const {
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
    releaseRequestSv,
    eliminatedFishSv,
  } = shared;

  const bubbleConfig = useMemo(
    () => ({
      originX: 0,
      originY: 0,
      targetCenterX: width * 0.5,
      targetCenterY: height * 0.5,
      targetDiameter: Math.min(width, height) * BUBBLE_DIAMETER_RATIO,
    }),
    [width, height],
  );

  const { anim, phase, enterProgress } = useBubbleAnimation(
    bubbleConfig,
    () => {},
    false,
    () => {},
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
      capturedFishIndexSv,
      captureOriginXSv,
      captureOriginYSv,
      enterProgress,
      escapeActiveSv,
      escapeCompleteTriggeredSv,
      escapeExitEdgeSv,
      escapeOverlayDismissTriggeredSv,
      escapeStageSv,
      escapeTargetXSv,
      escapeTargetYSv,
      offScreenTargetXSv,
      offScreenTargetYSv,
      phase,
    ],
  );

  const sim = useKoiFishSimulation({
    width,
    height,
    koiRect: swimRect,
    layoutKey: layout.layoutKey,
    words,
    captureState,
    releaseRequestSv,
    eliminatedFishSv,
    onEscapeOverlayDismiss: () => {},
    onEscapeComplete: () => {},
  });

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, zIndex != null && { zIndex }]}
      pointerEvents="none">
      <KoiFishLayer
        sim={sim}
        images={images}
        masks={masks}
        interactive={false}
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
