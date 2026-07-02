import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useUnderseaThemeAssetsContext } from '../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeClock } from '../core/clock/UnderseaThemeClockProvider';
import { UnderseaThemeSeafloorCanvas } from './seafloor/UnderseaThemeSeafloorCanvas';
import { UnderseaThemeStonesSeaweedCanvas } from './decor/UnderseaThemeStonesSeaweedCanvas';

export function UnderseaThemeBackground() {
  const { width, height } = useWindowDimensions();
  const { images } = useUnderseaThemeAssetsContext();
  const image = images.seafloor;
  const stoneImages = images.stones;
  const seaweedImages = images.seaweed;
  const clock = useUnderseaThemeClock();

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <UnderseaThemeSeafloorCanvas image={image} width={width} height={height} />
      <UnderseaThemeStonesSeaweedCanvas
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
