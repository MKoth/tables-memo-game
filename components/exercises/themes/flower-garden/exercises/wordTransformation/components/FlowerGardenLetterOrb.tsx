import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeLetterOrbProps } from '../../../../../themeContract';

export function FlowerGardenLetterOrb(_props: ThemeLetterOrbProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
