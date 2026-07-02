import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Fill, type SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { UnderseaThemeImages } from '../core/assets/underseaThemeAssets';
import { UnderseaThemeStonesSeaweedCanvas } from './decor/UnderseaThemeStonesSeaweedCanvas';
import { UnderseaThemeSeafloorCanvas } from './seafloor/UnderseaThemeSeafloorCanvas';

const LOADING_DIM_OVERLAY = 'rgba(4, 18, 32, 0.28)';

type UnderseaThemeSceneBackgroundProps = {
  seafloorImage: SkImage;
  stoneImages: UnderseaThemeImages['stones'] | null;
  seaweedImages: UnderseaThemeImages['seaweed'] | null;
  width: number;
  height: number;
  clock: SharedValue<number>;
  dimOverlay?: boolean;
};

export function UnderseaThemeSceneBackground({
  seafloorImage,
  stoneImages,
  seaweedImages,
  width,
  height,
  clock,
  dimOverlay = false,
}: UnderseaThemeSceneBackgroundProps) {
  const showForeground = stoneImages != null && seaweedImages != null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <UnderseaThemeSeafloorCanvas image={seafloorImage} width={width} height={height} />
      {showForeground && (
        <UnderseaThemeStonesSeaweedCanvas
          stoneImages={stoneImages}
          seaweedImages={seaweedImages}
          width={width}
          height={height}
          clock={clock}
        />
      )}
      {dimOverlay && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Fill color={LOADING_DIM_OVERLAY} />
        </Canvas>
      )}
    </View>
  );
}
