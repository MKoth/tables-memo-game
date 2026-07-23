import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useExerciseRuntime } from '../../../core';
import { useFlowerGardenAssetsContext } from '../core/providers/FlowerGardenAssetsProvider';
import { useFlowerGardenTableContext } from './flowerGardenTableContext';
import { useBushConfigs } from './BushShaderLayer/useBushConfigs';
import { BushShaderLayer } from './BushShaderLayer/BushShaderLayer';
import { SceneryShadowLayer } from './SceneryShadowLayer/SceneryShadowLayer';
import { FlowerGardenEarthCanvas } from './FlowerGardenEarthCanvas';
import { FlowerGardenGrassCanvas } from './FlowerGardenGrassCanvas';
import type { GrassHoleMaskConfig } from '../shaders/grassHoleMask.sksl';

const grassHoleMaskConfig: GrassHoleMaskConfig = {
  centerX: 0.5,
  centerY: 0.41,
  minDiameter: 400,
  maxDiameter: 370,
  waveAmplitude: 0.1,
  waveLength: 0.8,
  noiseAmount: 0.15,
  noiseScale: 0.2,
};

function FlowerGardenSceneryContent() {
  const { width, height } = useWindowDimensions();
  const { images } = useFlowerGardenAssetsContext();
  const { table } = useFlowerGardenTableContext();
  const { wordSpriteBridge } = useExerciseRuntime();
  const bushConfigs = useBushConfigs(table);

  const roseBellSizes = useMemo<number[]>(
    () => wordSpriteBridge?.bodySizes ?? [],
    [wordSpriteBridge?.bodySizes],
  );

  const stemImage = images.stemImage;
  const calyxImage = images.calyxImage;
  const leafImages = images.leafImages;

  if (
    stemImage == null ||
    calyxImage == null ||
    leafImages == null ||
    leafImages.length < 4
  ) {
    return null;
  }

  if (bushConfigs.length === 0) {
    return null;
  }

  if (roseBellSizes.length === 0) {
    return null;
  }

  if (wordSpriteBridge == null) {
    return null;
  }

  return (
    <>
      {images.earthImage != null && (
        <FlowerGardenEarthCanvas
          image={images.earthImage}
          width={width}
          height={height}
        />
      )}
      {images.grassImage != null && (
        <FlowerGardenGrassCanvas
          image={images.grassImage}
          width={width}
          height={height}
          scale={1.2}
          maskConfig={grassHoleMaskConfig}
        />
      )}
      <SceneryShadowLayer
        bushConfigs={bushConfigs}
        layoutX={wordSpriteBridge.layoutX}
        layoutY={wordSpriteBridge.layoutY}
        bodySizes={roseBellSizes}
      />
      <BushShaderLayer
        bushConfigs={bushConfigs}
        layoutX={wordSpriteBridge.layoutX}
        layoutY={wordSpriteBridge.layoutY}
        layoutScale={wordSpriteBridge.layoutScale}
        roseBellSizes={roseBellSizes}
        stemImage={stemImage}
        calyxImage={calyxImage}
        leafImages={leafImages}
      />
    </>
  );
}

export function FlowerGardenScenery() {
  return (
    <View style={styles.container} pointerEvents="none">
      <FlowerGardenSceneryContent />
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
  },
});
