import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { allWordLists } from '../../../data/wordsData';
import { UnderseaThemeBackground } from './background';
import {
  UnderseaThemeClockProvider,
  UnderseaThemeRuntimeProvider,
  WORD_LEARNING_STORE_CONFIG,
  useUnderseaThemeAssetsContext,
  useUnderseaThemeExerciseStore,
} from './core';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { UnderseaThemeExerciseShell } from './shared/UnderseaThemeExerciseShell';
import { UnderseaThemeCornerControls } from './ui';
import { sampleMatchSession } from './wordLearning/translationMatch/domain/sampleMatchSession';
import { MatchKoiLayer } from './wordLearning/translationMatch/components/MatchKoiLayer';
import { MatchJellyfishLayer } from './wordLearning/translationMatch/components/MatchJellyfishLayer';

const MATCH_KOI_Z = 3;
const MATCH_JELLYFISH_Z = 4;

type TranslationMatchContentProps = {
  sounds: UnderseaThemeSoundController;
};

function TranslationMatchContent({ sounds }: TranslationMatchContentProps) {
  const soundEnabled = useUnderseaThemeExerciseStore(state => state.soundEnabled);

  const entries = useMemo(() => sampleMatchSession(allWordLists), []);
  const englishWords = useMemo(() => entries.map(e => e.english), [entries]);
  const spanishWords = useMemo(() => entries.map(e => e.spanish), [entries]);

  useEffect(() => {
    sounds.startWaterflow();
    return () => {
      sounds.stopWaterflow();
    };
  }, [sounds]);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [sounds, soundEnabled]);

  return (
    <View style={styles.container}>
      <UnderseaThemeBackground />
      <MatchKoiLayer words={englishWords} zIndex={MATCH_KOI_Z} />
      <MatchJellyfishLayer words={spanishWords} zIndex={MATCH_JELLYFISH_Z} />
      <UnderseaThemeCornerControls helpVisible={false} />
    </View>
  );
}

function TranslationMatchContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();
  return (
    <UnderseaThemeRuntimeProvider>
      <UnderseaThemeClockProvider>
        <TranslationMatchContent sounds={sounds} />
      </UnderseaThemeClockProvider>
    </UnderseaThemeRuntimeProvider>
  );
}

export function UnderseaThemeWordLearningTranslationMatchExercise() {
  return (
    <UnderseaThemeExerciseShell storeConfig={WORD_LEARNING_STORE_CONFIG}>
      <TranslationMatchContentWithSounds />
    </UnderseaThemeExerciseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
