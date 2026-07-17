import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeTutorialOverrides } from '../../../../../themeContract';

type SpotlightProps = ThemeTutorialOverrides['SpotlightOverlay'] extends React.ComponentType<infer P> ? P : never;

export function FlowerGardenTutorialSpotlightOverlay(_props: SpotlightProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
