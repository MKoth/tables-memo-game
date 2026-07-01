import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useUnderseaAssetsContext } from './UnderseaAssetsContext';
import { useUnderseaClock } from './UnderseaClockContext';
import { UnderseaSeafloorShaderCanvas } from './UnderseaSeafloorShaderCanvas';
import { UnderseaStonesAndSeaweedCanvas } from './UnderseaStonesAndSeaweedCanvas';

export function UnderseaBackground() {
  const { width, height } = useWindowDimensions();
  const { images } = useUnderseaAssetsContext();
  const image = images.seafloor;
  const stoneImages = images.stones;
  const seaweedImages = images.seaweed;
  const clock = useUnderseaClock();

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <UnderseaSeafloorShaderCanvas image={image} width={width} height={height} />
      <UnderseaStonesAndSeaweedCanvas
        stoneImages={stoneImages}
        seaweedImages={seaweedImages}
        width={width}
        height={height}
        clock={clock}
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
    overflow: 'hidden',
  },
});
