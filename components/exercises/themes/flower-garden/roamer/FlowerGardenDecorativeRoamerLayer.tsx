import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeDecorativeRoamerLayerProps } from '../../../themeContract';
import { RoamerLayer } from './RoamerLayer';
import { ROAMER_BUTTERFLY_DECORATIVE_COUNT } from './butterfly/config/butterflySettings';
import type { SpeciesWeights } from './core/speciesAllocator';

export type FlowerGardenDecorativeRoamerLayerProps = ThemeDecorativeRoamerLayerProps & {
  /** Species mix for the decorative roamers (defaults to the shared config). */
  speciesWeights?: SpeciesWeights;
};

export function FlowerGardenDecorativeRoamerLayer({
  zIndex,
  roamerCount = ROAMER_BUTTERFLY_DECORATIVE_COUNT,
  speciesWeights,
}: FlowerGardenDecorativeRoamerLayerProps) {
  const words = useMemo(
    () => Array.from({ length: roamerCount }, (_, index) => `__decorative_${index}`),
    [roamerCount],
  );

  return (
    <View
      style={[styles.container, zIndex != null && { zIndex }]}
      pointerEvents="none"
    >
      <RoamerLayer
        words={words}
        interactive={false}
        sessionId={`decorative`}
        speciesWeights={speciesWeights}
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
