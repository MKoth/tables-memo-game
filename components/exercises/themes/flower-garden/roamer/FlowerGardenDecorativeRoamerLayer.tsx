import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeDecorativeRoamerLayerProps } from '../../../themeContract';
import { RoamerButterflyLayer } from './butterfly/RoamerButterflyLayer';
import { ROAMER_BUTTERFLY_DECORATIVE_COUNT } from './butterfly/config/butterflySettings';

export function FlowerGardenDecorativeRoamerLayer({
  zIndex,
  roamerCount = ROAMER_BUTTERFLY_DECORATIVE_COUNT,
}: ThemeDecorativeRoamerLayerProps) {
  const words = useMemo(
    () => Array.from({ length: roamerCount }, (_, index) => `__decorative_${index}`),
    [roamerCount],
  );

  return (
    <View
      style={[styles.container, zIndex != null && { zIndex }]}
      pointerEvents="none"
    >
      <RoamerButterflyLayer
        words={words}
        interactive={false}
        sessionId={`decorative`}
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
    overflow: 'visible',
  },
});
