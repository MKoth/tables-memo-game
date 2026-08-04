import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeLoadingBackdropProps } from '../../../../themeContract';
import {
  FlowerGardenBackgroundCanvas,
} from '../../scenery/FlowerGardenBackgroundCanvas/FlowerGardenBackgroundCanvas';
import type { EarthGrassBackgroundConfig } from '../../shaders/earthGrassBackground.sksl';

const FALLBACK_COLOR = '#0f2214';

const backgroundMaskConfig: EarthGrassBackgroundConfig = {
  centerX: 0.5,
  centerY: 0.41,
  minDiameter: 400,
  maxDiameter: 370,
  waveAmplitude: 0.1,
  waveLength: 0.8,
  noiseAmount: 0.15,
  noiseScale: 0.2,
};

export function FlowerGardenLoadingBackdrop({
  width,
  height,
  backgroundImage,
  decorationImages,
}: ThemeLoadingBackdropProps) {
  const grassImage = decorationImages?.grass;

  return (
    <View style={styles.container}>
      {backgroundImage != null && grassImage != null ? (
        <FlowerGardenBackgroundCanvas
          earthImage={backgroundImage}
          grassImage={grassImage}
          width={width}
          height={height}
          grassScale={1.2}
          maskConfig={backgroundMaskConfig}
        />
      ) : (
        <View
          style={[styles.fallback, { width, height }]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
  fallback: {
    backgroundColor: FALLBACK_COLOR,
  },
});
