import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeDecorativeRoamerLayerProps } from '../../../themeContract';

export function FlowerGardenDecorativeRoamerLayer(_props: ThemeDecorativeRoamerLayerProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
