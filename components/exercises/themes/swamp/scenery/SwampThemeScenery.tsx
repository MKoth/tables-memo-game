import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSwampThemeAssetsContext } from '../core/providers/SwampThemeAssetsProvider';
import { useExerciseClock } from '../../../core';
import { SwampThemeSceneryBackground } from './SwampThemeSceneryBackground';

function SwampThemeSceneryComponent() {
  const { width, height } = useWindowDimensions();
  const { images } = useSwampThemeAssetsContext();
  const clock = useExerciseClock();

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <SwampThemeSceneryBackground
        seafloorImage={images.seafloor}
        stoneImages={images.stones}
        algaeImages={images.algae}
        dropImages={images.drops}
        width={width}
        height={height}
        clock={clock}
      />
    </View>
  );
}

export const SwampThemeScenery = React.memo(SwampThemeSceneryComponent);

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
