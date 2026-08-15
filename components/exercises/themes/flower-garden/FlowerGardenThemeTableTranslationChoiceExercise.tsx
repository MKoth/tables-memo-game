import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { animalsWordList } from '../../../../data/wordsData';
import {
  ExerciseClockProvider,
  ExerciseLayoutProvider,
  ExerciseRuntimeProvider,
  WORD_LEARNING_STORE_CONFIG,
  useExerciseLayout,
  useExerciseStore,
  type ExerciseZoneRatios,
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
import { useTranslationChoiceGame } from '../../wordLearning/translationChoice/hooks/useTranslationChoiceGame';
import { useTranslationChoiceWordScene } from './exercises/wordLearning/translationChoice/components/useTranslationChoiceWordScene';
import { FlowerGardenTranslationChoiceOptionLayer } from './exercises/wordLearning/translationChoice/components/FlowerGardenTranslationChoiceOptionLayer';
import { FlowerGardenTransformationActorsCanvas } from './wordTransformationScene/FlowerGardenTransformationActorsCanvas';

const FULL_SCREEN_ZONE_RATIOS: ExerciseZoneRatios = {
  roamerFraction: 1,
  wordSpriteInsetRatio: 0,
  wordSpriteHeightFraction: 1,
};

/** The word rows sit in the upper half; the option roses take the lower half. */
const WORD_ZONE_FRACTION = 0.5;
/** Word row position inside the upper half — kept clear of the screen top. */
const WORD_ROW_Y_RATIO = 0.4;
/** Size multiplier for the option roses. */
const SIZE_SCALE = 1.5;
/** Petal scatter band anchored at the bottom, on the ground below the roses. */
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
const ORB_LAYER_Z = 10;
const OPTION_LAYER_Z = 15;

type TranslationChoiceContentProps = {
  sounds: FlowerGardenSoundController;
};

function TranslationChoiceContent({ sounds }: TranslationChoiceContentProps) {
  const soundEnabled = useExerciseStore(state => state.soundEnabled);
  const { orientation, screenWidth, screenHeight } = useExerciseLayout();

  const wordRect = useMemo<ZoneRect>(
    () => ({ x: 0, y: 0, w: screenWidth, h: screenHeight * WORD_ZONE_FRACTION }),
    [screenWidth, screenHeight],
  );
  const orbRect = useMemo<ZoneRect>(
    () => ({
      x: 0,
      y: screenHeight * WORD_ZONE_FRACTION,
      w: screenWidth,
      h: screenHeight * (1 - WORD_ZONE_FRACTION),
    }),
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

  const game = useTranslationChoiceGame({
    wordList: animalsWordList,
    orientation,
    screenWidth,
    screenHeight,
    roamerRect: orbRect,
    spriteRect: wordRect,
    optionSpawnEdges: ['bottom'],
    playSuccess: sounds.playSuccessClick,
    playWrong: sounds.playWrongClick,
  });

  const wordSceneSv = useTranslationChoiceWordScene({
    englishLetters: game.englishLetters,
    spanishLetters: game.spanishLetters,
    zoneRect: wordRect,
    rowYRatio: WORD_ROW_Y_RATIO,
  });

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
          />
        </View>
        <View style={[styles.fullLayer, { zIndex: OPTION_LAYER_Z }]} pointerEvents="box-none">
          <FlowerGardenTranslationChoiceOptionLayer
            options={game.options}
            motionPaths={game.optionMotionPaths}
            roundPhase={game.roundPhase}
            roundPos={game.roundPos}
            correctOptionIndex={game.correctOptionIndex}
            onOptionTap={game.handleOptionTap}
            roamerRect={orbRect}
            sizeScale={SIZE_SCALE}
          />
        </View>
        <View style={[styles.fullLayer, { zIndex: ORB_LAYER_Z }]} pointerEvents="box-none">
          <FlowerGardenTransformationActorsCanvas
            sceneStateSv={wordSceneSv}
            variantPickerItems={[]}
            onLetterPress={handleNeutralTap}
            onVariantSelect={handleNeutralTap}
            playPop={sounds.playOrbPop}
            playInflate={sounds.playOrbInflate}
            onNeutralTap={handleNeutralTap}
          />
        </View>
        <ExerciseCornerControls helpVisible={false} />
      </View>
    </FlowerGardenTableProvider>
  );
}

function TranslationChoiceContentWithSounds() {
  const { sounds } = useFlowerGardenAssetsContext();
  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <TranslationChoiceContent sounds={sounds} />
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
  );
}

export function FlowerGardenThemeTableTranslationChoiceExercise() {
  return (
    <ExerciseShell storeConfig={WORD_LEARNING_STORE_CONFIG}>
      <ExerciseLayoutProvider zoneRatios={FULL_SCREEN_ZONE_RATIOS}>
        <TranslationChoiceContentWithSounds />
      </ExerciseLayoutProvider>
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
