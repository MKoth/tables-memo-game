import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { getTableBodyWords, spanishPresentTable2Plural } from '../../../../data/tableData';
import { SwampThemeScenery } from './scenery';
import {
  ExerciseClockProvider,
  ExerciseRuntimeProvider,
  TABLE_EXERCISE_STORE_CONFIG,
  useExerciseStore,
} from '../../core';
import { useSwampThemeAssetsContext } from './core/providers/SwampThemeAssetsProvider';
import { ExerciseShell } from '../../shared';
import { ExerciseCornerControls } from '../../ui';

const WORD_SPRITE_LAYER_Z = 5;

function SwampThemeExerciseContent() {
  const table = spanishPresentTable2Plural;
  const words = useMemo(() => getTableBodyWords(table), [table]);
  const tutorialStep = useExerciseStore((state) => state.tutorialStep);
  const tutorialActive = tutorialStep !== 'idle';

  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <View style={styles.container}>
          <SwampThemeScenery />
          <View style={styles.wordSpriteLayer} pointerEvents="box-none" />
          <ExerciseCornerControls />
        </View>
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
  );
}

export function SwampThemeTableExercise() {
  return (
    <ExerciseShell storeConfig={TABLE_EXERCISE_STORE_CONFIG}>
      <SwampThemeExerciseContent />
    </ExerciseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
