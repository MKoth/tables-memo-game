import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { animalsWordList } from '../../../../data/wordsData';
import { UnderseaThemeScenery } from './scenery';
import {
  ExerciseClockProvider,
  ExerciseRuntimeProvider,
  WORD_LEARNING_STORE_CONFIG,
  useExerciseLayout,
  useExerciseStore,
} from '../../core';
import { useUnderseaThemeAssetsContext } from './core/providers/UnderseaThemeAssetsProvider';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { DecorativeRoamerLayer } from './roamer/DecorativeRoamerLayer/DecorativeRoamerLayer';
import { ExerciseShell } from '../../shared';
import { ExerciseCornerControls } from '../../ui';
import { TransformationWordBubbles } from './exercises/wordTransformation/components/TransformationWordBubbles';
import { OptionWordSpriteLayer } from './exercises/variantSelection/components/OptionWordSpriteLayer';
import { useTranslationChoiceGame } from '../../wordLearning/translationChoice/hooks/useTranslationChoiceGame';

const DECORATIVE_ROAMER_Z = 2;
const ENGLISH_WORD_LAYER_Z = 5;
const SPANISH_WORD_LAYER_Z = 6;
const OPTION_LAYER_Z = 10;

type TranslationChoiceContentProps = {
  sounds: UnderseaThemeSoundController;
};

function TranslationChoiceContent({ sounds }: TranslationChoiceContentProps) {
  const wordList = animalsWordList;
  const soundEnabled = useExerciseStore(state => state.soundEnabled);

  const { roamerRect, jellyRect, orientation, screenWidth, screenHeight } = useExerciseLayout();

  useEffect(() => {
    sounds.startWaterflow();
    return () => {
      sounds.stopWaterflow();
    };
  }, [sounds]);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [sounds, soundEnabled]);

  const game = useTranslationChoiceGame({
    wordList,
    orientation,
    screenWidth,
    screenHeight,
    roamerRect,
    jellyRect,
    playSuccess: sounds.playSuccessClick,
    playWrong: sounds.playWrongClick,
  });

  return (
    <View style={styles.container}>
      <UnderseaThemeScenery />
      <DecorativeRoamerLayer zIndex={DECORATIVE_ROAMER_Z} />
      <View style={styles.englishWordLayer} pointerEvents="box-none">
        <TransformationWordBubbles
          letters={game.englishLetters}
          interactive={false}
          onLetterPress={() => {}}
          playInflate={sounds.playBubbleInflate}
          playPop={sounds.playBubblePop}
          zoneRect={jellyRect}
        />
      </View>
      <View style={styles.spanishWordLayer} pointerEvents="box-none">
        <TransformationWordBubbles
          letters={game.spanishLetters}
          interactive={false}
          onLetterPress={() => {}}
          playInflate={sounds.playBubbleInflate}
          playPop={sounds.playBubblePop}
          zoneRect={jellyRect}
        />
      </View>
      <View style={styles.optionLayer} pointerEvents="box-none">
        <OptionWordSpriteLayer
          options={game.options}
          swimPaths={game.optionSwimPaths}
          roundPhase={game.roundPhase}
          roundPos={game.roundPos}
          correctOptionIndex={game.correctOptionIndex}
          onOptionTap={game.handleOptionTap}
        />
      </View>
      <ExerciseCornerControls helpVisible={false} />
    </View>
  );
}

function TranslationChoiceContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();
  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <TranslationChoiceContent sounds={sounds} />
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
  );
}

export function UnderseaThemeWordLearningTranslationChoiceExercise() {
  return (
    <ExerciseShell storeConfig={WORD_LEARNING_STORE_CONFIG}>
      <TranslationChoiceContentWithSounds />
    </ExerciseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  englishWordLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: ENGLISH_WORD_LAYER_Z,
  },
  spanishWordLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: SPANISH_WORD_LAYER_Z,
  },
  optionLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: OPTION_LAYER_Z,
  },
});
