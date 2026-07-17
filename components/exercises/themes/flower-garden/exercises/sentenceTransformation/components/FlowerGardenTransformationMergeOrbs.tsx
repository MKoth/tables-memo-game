import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeMergeOrbsProps } from '../../../../../themeContract';

export function FlowerGardenTransformationMergeOrbs(_props: ThemeMergeOrbsProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
