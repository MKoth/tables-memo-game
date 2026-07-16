import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useUnderseaThemeAssetsContext } from '../core/providers/UnderseaThemeAssetsProvider';
import { useExerciseClock } from '../../../core';
import { UnderseaThemeSceneryBackground } from './UnderseaThemeSceneryBackground';

export function UnderseaThemeScenery() {
  const { width, height } = useWindowDimensions();
  const { images } = useUnderseaThemeAssetsContext();
  const clock = useExerciseClock();

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <UnderseaThemeSceneryBackground
        seafloorImage={images.seafloor}
        stoneImages={images.stones}
        seaweedImages={images.seaweed}
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
