import React, { forwardRef, useImperativeHandle, useLayoutEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useExerciseLayout } from '../../../core';
import { KoiFishLayer } from '../fish/KoiFishLayer';
import { useKoiCaptureFlow } from './hooks/useKoiCaptureFlow';
import type { KoiSwimZoneController, KoiSwimZoneProps } from './types';

export type {
  RoamerCaptureBridge,
  KoiSwimZoneBubbleTarget,
  KoiSwimZoneController,
  KoiSwimZoneProps,
} from './types';

export const KoiSwimZone = forwardRef<KoiSwimZoneController, KoiSwimZoneProps>(
  function KoiSwimZone(
    {
      words,
      interactive: interactiveProp = true,
      captureEnabled = true,
      bubbleCaptureEnabled = true,
      swimZoneZIndex,
      bubbleTarget,
      sounds,
      controllerRef,
    },
    ref,
  ) {
    const { width, height } = useWindowDimensions();
    const layout = useExerciseLayout();
    const { koiRect, orientation, layoutKey } = layout;
    const { images: assetImages } = useUnderseaThemeAssetsContext();
    const images = assetImages.koi;
    const masks = assetImages.koiMasks;

    const {
      sim,
      selection,
      poolHiddenFishIndex,
      escapeActiveSv,
      capturedFishIndexSv,
      eliminatedFishIndices,
      eliminatedFishSv,
      handleFishSelect,
      getFishIndexForWord,
      armCaptureByWord,
      dispatchEscapeTo,
    } = useKoiCaptureFlow({
      words,
      width,
      height,
      koiRect,
      orientation,
      layoutKey,
      images,
      masks,
      sounds,
      bubbleTarget,
      bubbleCaptureEnabled,
    });

    const controller = useMemo<KoiSwimZoneController>(
      () => ({
        getFishIndexForWord,
        armCaptureByWord,
        dispatchEscapeTo,
      }),
      [getFishIndexForWord, armCaptureByWord, dispatchEscapeTo],
    );

    useImperativeHandle(ref, () => controller, [controller]);

    useLayoutEffect(() => {
      if (controllerRef != null) {
        controllerRef.current = controller;
      }
    }, [controller, controllerRef]);

    if (words.length === 0 || width === 0 || height === 0) {
      return null;
    }

    const fishInteractive =
      interactiveProp && captureEnabled && selection === null;

    return (
      <View
        style={[
          styles.container,
          swimZoneZIndex != null && { zIndex: swimZoneZIndex },
        ]}
        pointerEvents="box-none">
        <KoiFishLayer
          sim={sim}
          images={images}
          masks={masks}
          capturedFishIndex={poolHiddenFishIndex}
          escapeActive={bubbleCaptureEnabled ? undefined : escapeActiveSv}
          capturedFishIndexSv={bubbleCaptureEnabled ? undefined : capturedFishIndexSv}
          eliminatedFishSv={eliminatedFishSv}
          eliminatedFishIndices={eliminatedFishIndices}
          interactive={fishInteractive}
          onFishSelect={handleFishSelect}
        />
      </View>
    );
  },
);

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
