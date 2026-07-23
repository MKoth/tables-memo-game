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
import { DandelionShaderLayer } from './DandelionShaderLayer/DandelionShaderLayer';
import { useDandelionConfigs } from './DandelionShaderLayer/useDandelionConfigs';
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
  const dandelionConfigs = useDandelionConfigs();

  const roseBellSizes = useMemo<number[]>(
    () => wordSpriteBridge?.bodySizes ?? [],
    [wordSpriteBridge?.bodySizes],
  );

  const stemImage = images.stemImage;
  const calyxImage = images.calyxImage;
  const leafImages = images.leafImages;

  const bushReady =
    stemImage != null &&
    calyxImage != null &&
    leafImages != null &&
    leafImages.length >= 4 &&
    bushConfigs.length > 0 &&
    roseBellSizes.length > 0 &&
    wordSpriteBridge != null;

  const dandelionStemImages = images.dandelionStemImages;
  const dandelionLeafImages = images.dandelionLeafImages;
  const dandelionFlowerImages = images.dandelionFlowerImages;

  const dandelionReady =
    dandelionStemImages != null &&
    dandelionStemImages.length >= 4 &&
    dandelionLeafImages != null &&
    dandelionLeafImages.length >= 4 &&
    dandelionFlowerImages != null &&
    dandelionFlowerImages.length >= 4;

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
      {bushReady && (
        <>
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
      )}
      {dandelionReady && dandelionConfigs.length > 0 && (
        <DandelionShaderLayer
          configs={dandelionConfigs}
          stemImages={dandelionStemImages}
          leafImages={dandelionLeafImages}
          flowerImages={dandelionFlowerImages}
        />
      )}
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
