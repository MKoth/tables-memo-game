import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeSentenceRowLayerProps } from '../../../../../themeContract';

export function FlowerGardenWordSpriteSentenceRowLayer(_props: ThemeSentenceRowLayerProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
