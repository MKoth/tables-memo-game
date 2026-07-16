import React, { forwardRef, useImperativeHandle, useLayoutEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useExerciseLayout } from '../../../../core';
import { RoamerFishLayer } from '../roamerFish/RoamerFishLayer';
import { useRoamerCaptureFlow } from './hooks/useRoamerCaptureFlow';
import type { RoamerSwimZoneController, RoamerSwimZoneProps } from './types';

export type {
  RoamerCaptureBridge,
  RoamerSwimZoneBubbleTarget,
  RoamerSwimZoneController,
  RoamerSwimZoneProps,
} from './types';

export const RoamerSwimZone = forwardRef<RoamerSwimZoneController, RoamerSwimZoneProps>(
  function RoamerSwimZone(
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
    const { roamerRect, orientation, layoutKey } = layout;
    const { images: assetImages } = useUnderseaThemeAssetsContext();
    const images = assetImages.roamer;
    const masks = assetImages.roamerMasks;

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
    } = useRoamerCaptureFlow({
      words,
      width,
      height,
      roamerRect,
      orientation,
      layoutKey,
      images,
      masks,
      sounds,
      bubbleTarget,
      bubbleCaptureEnabled,
    });

    const controller = useMemo<RoamerSwimZoneController>(
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
        <RoamerFishLayer
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
