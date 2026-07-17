import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeMatchRoamerLayerProps } from '../../../../../../themeContract';

export function FlowerGardenMatchRoamerLayer(_props: ThemeMatchRoamerLayerProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
