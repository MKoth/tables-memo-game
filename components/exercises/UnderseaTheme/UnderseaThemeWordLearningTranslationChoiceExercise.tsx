import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { animalsWordList } from '../../../data/wordsData';
import { UnderseaThemeBackground } from './background';
import {
  UnderseaThemeClockProvider,
  UnderseaThemeRuntimeProvider,
  WORD_LEARNING_STORE_CONFIG,
  useUnderseaThemeAssetsContext,
  useUnderseaThemeExerciseStore,
  useUnderseaThemeLayout,
} from './core';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { DecorativeKoiLayer } from './koi/DecorativeKoiLayer/DecorativeKoiLayer';
import { UnderseaThemeExerciseShell } from './shared/UnderseaThemeExerciseShell';
import { UnderseaThemeCornerControls } from './ui';
import { TransformationWordBubbles } from './wordTransformation/components/TransformationWordBubbles';
import { OptionJellyfishLayer } from './variantSelection/components/OptionJellyfishLayer';
import { useTranslationChoiceGame } from './wordLearning/translationChoice/hooks/useTranslationChoiceGame';

const DECORATIVE_KOI_Z = 2;
const ENGLISH_WORD_LAYER_Z = 5;
const SPANISH_WORD_LAYER_Z = 6;
const OPTION_LAYER_Z = 10;

type TranslationChoiceContentProps = {
  sounds: UnderseaThemeSoundController;
};

function TranslationChoiceContent({ sounds }: TranslationChoiceContentProps) {
  const wordList = animalsWordList;
  const soundEnabled = useUnderseaThemeExerciseStore(state => state.soundEnabled);

  const { koiRect, jellyRect, orientation, screenWidth, screenHeight } = useUnderseaThemeLayout();

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
    koiRect,
    jellyRect,
    playSuccess: sounds.playSuccessClick,
    playWrong: sounds.playWrongClick,
  });

  return (
    <View style={styles.container}>
      <UnderseaThemeBackground />
      <DecorativeKoiLayer zIndex={DECORATIVE_KOI_Z} />
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
        <OptionJellyfishLayer
          options={game.options}
          swimPaths={game.optionSwimPaths}
          roundPhase={game.roundPhase}
          roundPos={game.roundPos}
          correctOptionIndex={game.correctOptionIndex}
          onOptionTap={game.handleOptionTap}
        />
      </View>
      <UnderseaThemeCornerControls helpVisible={false} />
    </View>
  );
}

function TranslationChoiceContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();
  return (
    <UnderseaThemeRuntimeProvider>
      <UnderseaThemeClockProvider>
        <TranslationChoiceContent sounds={sounds} />
      </UnderseaThemeClockProvider>
    </UnderseaThemeRuntimeProvider>
  );
}

export function UnderseaThemeWordLearningTranslationChoiceExercise() {
  return (
    <UnderseaThemeExerciseShell storeConfig={WORD_LEARNING_STORE_CONFIG}>
      <TranslationChoiceContentWithSounds />
    </UnderseaThemeExerciseShell>
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
