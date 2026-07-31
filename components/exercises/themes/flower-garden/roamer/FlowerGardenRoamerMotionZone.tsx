import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeRoamerMotionZoneProps } from '../../../themeContract';
import type { RoamerSimulation } from './core/useRoamerSimulation';
import { RoamerLayer } from './RoamerLayer';

export function FlowerGardenRoamerMotionZone({
  words,
  interactive = false,
  sim,
  hiddenIndices = [],
}: ThemeRoamerMotionZoneProps & { sim?: RoamerSimulation; hiddenIndices?: number[] }) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <RoamerLayer
        words={words}
        interactive={interactive}
        sim={sim}
        hiddenIndices={hiddenIndices}
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
