import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeTransformationWordOrbsProps } from '../../../../../themeContract';

export function FlowerGardenTransformationWordOrbs(_props: ThemeTransformationWordOrbsProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
