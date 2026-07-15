import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useUnderseaThemeAssetsContext } from '../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeClock } from '../core/clock/UnderseaThemeClockProvider';
import { UnderseaThemeSceneBackground } from './UnderseaThemeSceneBackground';

export function UnderseaThemeBackground() {
  const { width, height } = useWindowDimensions();
  const { images } = useUnderseaThemeAssetsContext();
  const clock = useUnderseaThemeClock();

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <UnderseaThemeSceneBackground
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
