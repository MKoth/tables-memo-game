import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spanishPresentTable2Plural } from '../../../../data/tableData';
import { ExerciseClockProvider, ExerciseRuntimeProvider, TABLE_EXERCISE_STORE_CONFIG, useExerciseStore } from '../../core';
import { FlowerGardenWordSpriteTableLayer } from './carrier/FlowerGardenWordSpriteTableLayer/FlowerGardenWordSpriteTableLayerOuter';
import { ExerciseShell } from '../../shared';
import { ExerciseCornerControls } from '../../ui';

const WORD_SPRITE_LAYER_Z = 5;

function FlowerGardenExerciseContent() {
  const table = spanishPresentTable2Plural;
  const tutorialStep = useExerciseStore((state) => state.tutorialStep);
  const tutorialActive = tutorialStep !== 'idle';

  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <View style={styles.container}>
          <View style={styles.wordSpriteLayer} pointerEvents="box-none">
            <FlowerGardenWordSpriteTableLayer
              table={table}
              interactive={!tutorialActive}
            />
          </View>
          <ExerciseCornerControls />
        </View>
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
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
    backgroundColor: '#2d5a27',
  },
  wordSpriteLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: WORD_SPRITE_LAYER_Z,
  },
});
