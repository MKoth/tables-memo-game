import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useExerciseRuntime } from '../../../core';
import { useFlowerGardenAssetsContext } from '../core/providers/FlowerGardenAssetsProvider';
import { useFlowerGardenTableContext } from './flowerGardenTableContext';
import { useBushConfigs } from './BushShaderLayer/useBushConfigs';
import { BushAndShadowLayer } from './BushAndShadowLayer';
import { FlowerGardenBackgroundCanvas } from './FlowerGardenBackgroundCanvas/FlowerGardenBackgroundCanvas';
import { FieldFlowerShaderLayer } from './FieldFlowerShaderLayer/FieldFlowerShaderLayer';
import {
  GroundScatterShaderLayer,
  type GroundScatterGroup,
} from './GroundScatterLayer/GroundScatterShaderLayer';
import { useGroundScatterConfigs } from './GroundScatterLayer/useGroundScatterConfigs';
import type { EarthGrassBackgroundConfig } from '../shaders/earthGrassBackground.sksl';

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

function allImagesReady(
  ...sets: (readonly import('@shopify/react-native-skia').SkImage[] | null)[]
): boolean {
  for (const set of sets) {
    if (set == null || set.length < 4) return false;
  }
  return true;
}

function FlowerGardenSceneryContent() {
  const { width, height } = useWindowDimensions();
  const { images } = useFlowerGardenAssetsContext();
  const { table, fieldFlowerConfigs, flowerSwingBoosts, groundScatterBandZone } =
    useFlowerGardenTableContext();
  const { wordSpriteBridge } = useExerciseRuntime();
  const bushConfigs = useBushConfigs(table);

  const roseBellSizes = useMemo<number[]>(
    () => wordSpriteBridge?.bodySizes ?? [],
    [wordSpriteBridge?.bodySizes],
  );

  const stemImage = images.stemImage;
  const calyxImage = images.calyxImage;
  const leafImages = images.leafImages;
  const roseLeafAtlas = images.roseLeafAtlas;
  const substrateImage = images.substrateImage;
  const cloverImages = images.cloverImages;
  const mossStoneImages = images.mossStoneImages;
  const petalImages = images.petalImages;

  const stoneConfigs = useGroundScatterConfigs({
    kind: 'even',
    variantCount: mossStoneImages?.length ?? 6,
  });
  const cloverConfigs = useGroundScatterConfigs({
    kind: 'edge',
    variantCount: cloverImages?.length ?? 4,
  });
  const petalConfigs = useGroundScatterConfigs({
    kind: 'band',
    variantCount: petalImages?.length ?? 6,
    bandZone: groundScatterBandZone ?? null,
  });

  const groundDecorReady =
    cloverImages != null &&
    cloverImages.length >= 4 &&
    mossStoneImages != null &&
    mossStoneImages.length >= 6 &&
    petalImages != null &&
    petalImages.length >= 6;

  const bushReady =
    stemImage != null &&
    calyxImage != null &&
    leafImages != null &&
    leafImages.length >= 4 &&
    substrateImage != null &&
    roseLeafAtlas != null &&
    bushConfigs.length > 0 &&
    roseBellSizes.length > 0 &&
    wordSpriteBridge != null;
  const dandelionStemImages = images.dandelionStemImages;
  const dandelionLeafImages = images.dandelionLeafImages;
  const dandelionFlowerImages = images.dandelionFlowerImages;
  const chamomileStemImages = images.chamomileStemImages;
  const chamomileLeafImages = images.chamomileLeafImages;
  const chamomileFlowerImages = images.chamomileFlowerImages;
  const poppyStemImages = images.poppyStemImages;
  const poppyLeafImages = images.poppyLeafImages;
  const poppyFlowerImages = images.poppyFlowerImages;
  const wildVioletStemImages = images.wildVioletStemImages;
  const wildVioletLeafImages = images.wildVioletLeafImages;
  const wildVioletFlowerImages = images.wildVioletFlowerImages;

  const fieldFlowersReady = allImagesReady(
    dandelionStemImages, dandelionLeafImages, dandelionFlowerImages,
    chamomileStemImages, chamomileLeafImages, chamomileFlowerImages,
    poppyStemImages, poppyLeafImages, poppyFlowerImages,
    wildVioletStemImages, wildVioletLeafImages, wildVioletFlowerImages,
  );

  return (
    <>
      {images.earthImage != null && images.grassImage != null && (
        <FlowerGardenBackgroundCanvas
          earthImage={images.earthImage}
          grassImage={images.grassImage}
          width={width}
          height={height}
          grassScale={1.2}
          maskConfig={backgroundMaskConfig}
        />
      )}
      {groundDecorReady && (
        <GroundScatterShaderLayer
          groups={
            [
              { configs: stoneConfigs, images: mossStoneImages },
              { configs: petalConfigs, images: petalImages },
              { configs: cloverConfigs, images: cloverImages },
            ] as GroundScatterGroup[]
          }
          viewportRect={{ x: 0, y: 0, width, height }}
        />
      )}
      {bushReady && (
        <>
          <BushAndShadowLayer
            bushConfigs={bushConfigs}
            layoutX={wordSpriteBridge.layoutX}
            layoutY={wordSpriteBridge.layoutY}
            layoutScale={wordSpriteBridge.layoutScale}
            roseBellSizes={roseBellSizes}
            stemImage={stemImage}
            calyxImage={calyxImage}
            leafAtlas={roseLeafAtlas}
          />
        </>
      )}
      {fieldFlowersReady && fieldFlowerConfigs != null && fieldFlowerConfigs.length > 0 && (
        <FieldFlowerShaderLayer
          configs={fieldFlowerConfigs}
          flowerSwingBoosts={flowerSwingBoosts}
          dandelionStemImages={dandelionStemImages!}
          dandelionLeafImages={dandelionLeafImages!}
          dandelionFlowerImages={dandelionFlowerImages!}
          chamomileStemImages={chamomileStemImages!}
          chamomileLeafImages={chamomileLeafImages!}
          chamomileFlowerImages={chamomileFlowerImages!}
          poppyStemImages={poppyStemImages!}
          poppyLeafImages={poppyLeafImages!}
          poppyFlowerImages={poppyFlowerImages!}
          wildVioletStemImages={wildVioletStemImages!}
          wildVioletLeafImages={wildVioletLeafImages!}
          wildVioletFlowerImages={wildVioletFlowerImages!}
        />
      )}
    </>
  );
}

export function FlowerGardenSceneryComponent() {
  return (
    <View style={styles.container} pointerEvents="none">
      <FlowerGardenSceneryContent />
    </View>
  );
}

export const FlowerGardenScenery = React.memo(FlowerGardenSceneryComponent);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
