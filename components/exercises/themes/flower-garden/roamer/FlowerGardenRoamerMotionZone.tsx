import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeRoamerMotionZoneProps } from '../../../themeContract';
import { RoamerButterflyLayer } from './butterfly/RoamerButterflyLayer';

export function FlowerGardenRoamerMotionZone({
  words,
  interactive = false,
}: ThemeRoamerMotionZoneProps) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <RoamerButterflyLayer
        words={words}
        interactive={interactive}
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
