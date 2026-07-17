import React from 'react';
import { StyleSheet, View } from 'react-native';

export function FlowerGardenScenery() {
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
