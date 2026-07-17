import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeOptionWordSpriteLayerProps } from '../../../../../themeContract';

export function FlowerGardenOptionWordSpriteLayer(_props: ThemeOptionWordSpriteLayerProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
