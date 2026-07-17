import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeWordSpriteTableLayerProps } from '../../../themeContract';

export function FlowerGardenWordSpriteTableLayer(_props: ThemeWordSpriteTableLayerProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
