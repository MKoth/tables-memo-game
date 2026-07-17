import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeLoadingBackdropProps } from '../../../../themeContract';

const FALLBACK_COLOR = '#0f2214';

export function FlowerGardenLoadingBackdrop({ width, height }: ThemeLoadingBackdropProps) {
  return (
    <View
      style={[styles.container, { width, height }]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: FALLBACK_COLOR,
  },
});
