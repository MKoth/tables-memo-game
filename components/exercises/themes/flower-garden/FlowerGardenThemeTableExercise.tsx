import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TABLE_EXERCISE_STORE_CONFIG } from '../../core';
import { ExerciseShell } from '../../shared';

function FlowerGardenExerciseContent() {
  return (
    <View style={styles.container}>
      <View style={styles.emptyLayer} pointerEvents="none" />
    </View>
  );
}

export function FlowerGardenThemeTableExercise() {
  return (
    <ExerciseShell storeConfig={TABLE_EXERCISE_STORE_CONFIG}>
      <FlowerGardenExerciseContent />
    </ExerciseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
