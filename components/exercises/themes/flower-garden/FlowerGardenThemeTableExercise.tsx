import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spanishPresentTable2Plural } from '../../../../data/tableData';
import { ExerciseClockProvider, ExerciseRuntimeProvider, TABLE_EXERCISE_STORE_CONFIG, useExerciseStore } from '../../core';
import { FlowerGardenWordSpriteTableLayer } from './carrier/FlowerGardenWordSpriteTableLayer/FlowerGardenWordSpriteTableLayerOuter';
import { ExerciseShell } from '../../shared';
import { ExerciseCornerControls } from '../../ui';
import { FlowerGardenScenery } from './scenery/FlowerGardenScenery';
import { FlowerGardenTableProvider } from './scenery/flowerGardenTableContext';

const WORD_SPRITE_LAYER_Z = 5;
const SCENERY_Z = 1;

function FlowerGardenExerciseContent() {
  const table = spanishPresentTable2Plural;
  const tutorialStep = useExerciseStore((state) => state.tutorialStep);
  const tutorialActive = tutorialStep !== 'idle';

  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <FlowerGardenTableProvider value={{ table }}>
          <View style={styles.container}>
            <View style={styles.sceneryLayer} pointerEvents="none">
              <FlowerGardenScenery />
            </View>
            <View style={styles.wordSpriteLayer} pointerEvents="box-none">
              <FlowerGardenWordSpriteTableLayer
                table={table}
                interactive={!tutorialActive}
              />
            </View>
            <ExerciseCornerControls />
          </View>
        </FlowerGardenTableProvider>
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
  },
  sceneryLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: SCENERY_Z,
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
