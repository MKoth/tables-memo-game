import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { getTableBodyWords, spanishPresentTable2Plural } from '../../../../data/tableData';
import {
  ExerciseClockProvider,
  ExerciseRuntimeProvider,
  TABLE_EXERCISE_STORE_CONFIG,
  useExerciseLayout,
  useExerciseStore,
} from '../../core';
import { FlowerGardenWordSpriteTableLayer } from './carrier/FlowerGardenWordSpriteTableLayer/FlowerGardenWordSpriteTableLayerOuter';
import { FlowerGardenRoamerMotionZone } from './roamer/FlowerGardenRoamerMotionZone';
import { ExerciseShell } from '../../shared';
import { ExerciseCornerControls } from '../../ui';
import { FlowerGardenScenery } from './scenery/FlowerGardenScenery';
import { FlowerGardenTableProvider } from './scenery/flowerGardenTableContext';
import { useFieldFlowerConfigs } from './scenery/FieldFlowerShaderLayer/useFieldFlowerConfigs';
import { useRoamerSimulation } from './roamer/core/useRoamerSimulation';
import { FlowerGardenParticleLayer } from './roamer/particles/FlowerGardenParticleLayer';
import { PARTICLE_Z } from './roamer/particles/particleConfig';

const WORD_SPRITE_LAYER_Z = 5;
const SCENERY_Z = 1;
const ROAMER_Z = 2;

function SimAndLayers({
  words,
  interactive,
}: {
  words: string[];
  interactive: boolean;
}) {
  const layout = useExerciseLayout();
  const { roamerRect, screenWidth, screenHeight, layoutKey } = layout;

  const sim = useRoamerSimulation({
    words,
    width: screenWidth,
    height: screenHeight,
    roamerRect,
    layoutKey,
  });

  return (
    <>
      <View style={[styles.fullLayer, { zIndex: PARTICLE_Z }]} pointerEvents="none">
        <FlowerGardenParticleLayer
          runtimeEntries={sim.runtimeEntries}
          width={screenWidth}
          height={screenHeight}
        />
      </View>
      <View style={[styles.fullLayer, { zIndex: ROAMER_Z }]} pointerEvents="box-none">
        <FlowerGardenRoamerMotionZone
          words={words}
          interactive={interactive}
          sim={sim}
        />
      </View>
    </>
  );
}

function FlowerGardenExerciseContent() {
  const table = spanishPresentTable2Plural;
  const words = useMemo(() => getTableBodyWords(table), [table]);
  const tutorialStep = useExerciseStore((state) => state.tutorialStep);
  const tutorialActive = tutorialStep !== 'idle';
  const fieldFlowerConfigs = useFieldFlowerConfigs();
  const flowerSwingBoosts = useSharedValue<number[]>([]);

  useEffect(() => {
    flowerSwingBoosts.value = new Array(Math.max(fieldFlowerConfigs.length, 1)).fill(0);
  }, [fieldFlowerConfigs.length, flowerSwingBoosts]);

  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <FlowerGardenTableProvider value={{ table, fieldFlowerConfigs, flowerSwingBoosts }}>
          <View style={styles.container}>
            <View style={styles.sceneryLayer} pointerEvents="none">
              <FlowerGardenScenery />
            </View>
            <SimAndLayers
              words={words}
              interactive={!tutorialActive}
            />
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
  fullLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
