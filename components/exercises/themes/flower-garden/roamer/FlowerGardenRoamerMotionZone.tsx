import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeRoamerMotionZoneProps } from '../../../themeContract';

export function FlowerGardenRoamerMotionZone(_props: ThemeRoamerMotionZoneProps) {
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
