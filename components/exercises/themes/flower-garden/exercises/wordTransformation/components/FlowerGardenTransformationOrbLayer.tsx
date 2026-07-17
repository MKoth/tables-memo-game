import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeTransformationOrbLayerProps } from '../../../../../themeContract';

export function FlowerGardenTransformationOrbLayer(_props: ThemeTransformationOrbLayerProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
