import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeResolutionOrbProps } from '../../../../../themeContract';

export function FlowerGardenTransformationRoundResolutionOrb(_props: ThemeResolutionOrbProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
