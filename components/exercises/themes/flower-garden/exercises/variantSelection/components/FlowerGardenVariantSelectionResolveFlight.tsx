import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeResolveFlightProps } from '../../../../../themeContract';

export function FlowerGardenVariantSelectionResolveFlight(_props: ThemeResolveFlightProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
