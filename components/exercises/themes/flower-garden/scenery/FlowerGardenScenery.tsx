import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useExerciseRuntime } from '../../../core';
import { useFlowerGardenAssetsContext } from '../core/providers/FlowerGardenAssetsProvider';
import { useFlowerGardenTableContext } from './flowerGardenTableContext';
import { useBushConfigs } from './BushShaderLayer/useBushConfigs';
import { BushShaderLayer } from './BushShaderLayer/BushShaderLayer';

function FlowerGardenSceneryContent() {
  const { images } = useFlowerGardenAssetsContext();
  const { table } = useFlowerGardenTableContext();
  const { wordSpriteBridge } = useExerciseRuntime();
  const bushConfigs = useBushConfigs(table);

  const roseBellSizes = useMemo<number[]>(() => {
    if (table == null) return [];
    const bodyStart = table.colHeaders.length + table.rowHeaders.length;
    const allSizes = wordSpriteBridge?.bodySizes ?? [];
    return allSizes.slice(bodyStart);
  }, [table, wordSpriteBridge?.bodySizes]);

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
    <BushShaderLayer
      bushConfigs={bushConfigs}
      bodyCellIndices={wordSpriteBridge.bodyCellIndices}
      layoutX={wordSpriteBridge.layoutX}
      layoutY={wordSpriteBridge.layoutY}
      layoutScale={wordSpriteBridge.layoutScale}
      roseBellSizes={roseBellSizes}
      stemImage={stemImage}
      calyxImage={calyxImage}
      leafImages={leafImages}
    />
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
