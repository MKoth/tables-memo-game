import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { animalsWordList } from '../../../../data/wordsData';
import {
  ExerciseClockProvider,
  ExerciseRuntimeProvider,
  WORD_LEARNING_STORE_CONFIG,
  useExerciseLayout,
  useExerciseStore,
  type ZoneRect,
} from '../../core';
import { useFlowerGardenAssetsContext } from './core/providers/FlowerGardenAssetsProvider';
import type { FlowerGardenSoundController } from './core/assets/useFlowerGardenThemeSounds';
import { useFieldFlowerConfigs } from './scenery/FieldFlowerShaderLayer/useFieldFlowerConfigs';
import { FlowerGardenScenery } from './scenery/FlowerGardenScenery';
import { FlowerGardenTableProvider } from './scenery/flowerGardenTableContext';
import { FlowerGardenDecorativeRoamerLayer } from './roamer/FlowerGardenDecorativeRoamerLayer';
import { ExerciseShell } from '../../shared';
import { ExerciseCornerControls } from '../../ui';
import { useTranslationSpellingGame } from '../../wordLearning/translationSpelling/hooks/useTranslationSpellingGame';
import { useTranslationSpellingScenes } from './exercises/wordLearning/translationSpelling/components/useTranslationSpellingScenes';
import { FlowerGardenTransformationActorsCanvas } from './wordTransformationScene/FlowerGardenTransformationActorsCanvas';

/** The word rows sit in the upper half; the letter pool takes the lower half. */
const WORD_ZONE_FRACTION = 0.5;
/** Petal scatter band anchored at the bottom, on the ground below the pool. */
const PETAL_BAND_HEIGHT_RATIO = 0.22;
/** Sparse petal count for the bottom band. */
const PETAL_COUNT = 10;
/** Field flowers spread across the whole screen, doubled for density. */
const FIELD_FLOWER_COUNT = 20;
/** Decorative roamers: double the default, mostly butterflies. */
const DECORATIVE_ROAMER_COUNT = 8;
const DECORATIVE_ROAMER_SPECIES_WEIGHTS = {
  butterfly: 8,
  bee: 2,
  bumblebee: 1,
} as const;

const SCENERY_Z = 1;
const DECORATIVE_ROAMER_Z = 2;
const ENGLISH_LAYER_Z = 5;
const SPANISH_LAYER_Z = 6;
const POOL_LAYER_Z = 10;

type TranslationSpellingContentProps = {
  sounds: FlowerGardenSoundController;
};

function TranslationSpellingContent({ sounds }: TranslationSpellingContentProps) {
  const soundEnabled = useExerciseStore(state => state.soundEnabled);
  const { orientation, screenWidth, screenHeight } = useExerciseLayout();
  const isLandscape = orientation === 'landscapeLeft' || orientation === 'landscapeRight';

  const wordRect = useMemo<ZoneRect>(
    () =>
      isLandscape
        ? { x: screenWidth * WORD_ZONE_FRACTION, y: 0, w: screenWidth * (1 - WORD_ZONE_FRACTION), h: screenHeight }
        : { x: 0, y: 0, w: screenWidth, h: screenHeight * WORD_ZONE_FRACTION },
    [screenWidth, screenHeight, isLandscape],
  );
  const orbRect = useMemo<ZoneRect>(
    () =>
      isLandscape
        ? { x: 0, y: 0, w: screenWidth * WORD_ZONE_FRACTION, h: screenHeight }
        : { x: 0, y: screenHeight * WORD_ZONE_FRACTION, w: screenWidth, h: screenHeight * (1 - WORD_ZONE_FRACTION) },
    [screenWidth, screenHeight, isLandscape],
  );

  const fullScreenRect = useMemo<ZoneRect>(
    () => ({ x: 0, y: 0, w: screenWidth, h: screenHeight }),
    [screenWidth, screenHeight],
  );
  const fieldFlowerConfigs = useFieldFlowerConfigs({
    lowerScreenFraction: 1,
    count: FIELD_FLOWER_COUNT,
  });
  const flowerSwingBoosts = useSharedValue<number[]>([]);
  const petalBandZone = useMemo<ZoneRect>(
    () => ({
      x: 0,
      y: screenHeight * (1 - PETAL_BAND_HEIGHT_RATIO),
      w: screenWidth,
      h: screenHeight * PETAL_BAND_HEIGHT_RATIO,
    }),
    [screenWidth, screenHeight],
  );

  useEffect(() => {
    flowerSwingBoosts.value = new Array(Math.max(fieldFlowerConfigs.length, 1)).fill(0);
  }, [fieldFlowerConfigs.length, flowerSwingBoosts]);

  useEffect(() => {
    sounds.startAmbient();
    return () => {
      sounds.stopAmbient();
    };
  }, [sounds]);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [sounds, soundEnabled]);

  const game = useTranslationSpellingGame({
    wordList: animalsWordList,
    orientation,
    roamerRect: orbRect,
    spriteRect: wordRect,
    playOrbInflate: sounds.playOrbInflate,
    playWrong: sounds.playWrongClick,
  });

  const scenes = useTranslationSpellingScenes({
    englishLetters: game.englishLetters,
    spanishLetters: game.spanishLetters,
    poolLetters: game.poolLetters,
    activeFlight: game.activeFlight,
    wordRect,
    orbRect,
  });

  const handlePoolLetterPress = useCallback(
    (position: number) => {
      const letter = game.poolLetters[position];
      if (letter == null) {
        return;
      }
      game.handleLetterTap(letter.id);
    },
    [game],
  );

  const handleNeutralTap = useCallback(() => {}, []);

  return (
    <FlowerGardenTableProvider
      value={{
        table: null,
        fieldFlowerConfigs,
        flowerSwingBoosts,
        groundScatterBandZone: petalBandZone,
        earthMaskConfig: null,
        petalCount: PETAL_COUNT,
      }}>
      <View style={styles.container}>
        <View style={[styles.fullLayer, { zIndex: SCENERY_Z }]} pointerEvents="none">
          <FlowerGardenScenery />
        </View>
        <View style={[styles.fullLayer, { zIndex: DECORATIVE_ROAMER_Z }]} pointerEvents="none">
          <FlowerGardenDecorativeRoamerLayer
            roamerCount={DECORATIVE_ROAMER_COUNT}
            speciesWeights={DECORATIVE_ROAMER_SPECIES_WEIGHTS}
            roamerRect={fullScreenRect}
          />
        </View>
        <View style={[styles.fullLayer, { zIndex: ENGLISH_LAYER_Z }]} pointerEvents="box-none">
          <FlowerGardenTransformationActorsCanvas
            sceneStateSv={scenes.english}
            variantPickerItems={[]}
            onLetterPress={handleNeutralTap}
            onVariantSelect={handleNeutralTap}
            playPop={sounds.playOrbPop}
            playInflate={sounds.playOrbInflate}
          />
        </View>
        <View style={[styles.fullLayer, { zIndex: SPANISH_LAYER_Z }]} pointerEvents="box-none">
          <FlowerGardenTransformationActorsCanvas
            sceneStateSv={scenes.spanish}
            variantPickerItems={[]}
            onLetterPress={handleNeutralTap}
            onVariantSelect={handleNeutralTap}
            playPop={sounds.playOrbPop}
            playInflate={sounds.playOrbInflate}
          />
        </View>
        <View style={[styles.fullLayer, { zIndex: POOL_LAYER_Z }]} pointerEvents="box-none">
          <FlowerGardenTransformationActorsCanvas
            sceneStateSv={scenes.pool}
            variantPickerItems={[]}
            onLetterPress={handlePoolLetterPress}
            onVariantSelect={handleNeutralTap}
            playPop={sounds.playOrbPop}
            playInflate={sounds.playOrbInflate}
          />
        </View>
        <ExerciseCornerControls helpVisible={false} />
      </View>
    </FlowerGardenTableProvider>
  );
}

function TranslationSpellingContentWithSounds() {
  const { sounds } = useFlowerGardenAssetsContext();
  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <TranslationSpellingContent sounds={sounds} />
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
  );
}

export function FlowerGardenThemeTableTranslationSpellingExercise() {
  return (
    <ExerciseShell storeConfig={WORD_LEARNING_STORE_CONFIG}>
      <TranslationSpellingContentWithSounds />
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
});
