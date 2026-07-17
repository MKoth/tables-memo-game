import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeMatchWordSpriteLayerProps } from '../../../../../../themeContract';

export function FlowerGardenMatchWordSpriteLayer(_props: ThemeMatchWordSpriteLayerProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
