import React, { useEffect, useMemo, useRef } from 'react';
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
import {
  createMatchSessionController,
  type MatchSessionController,
} from './wordLearning/translationMatch/domain/matchSessionController';
import { MatchKoiLayer } from './wordLearning/translationMatch/components/MatchKoiLayer';
import { MatchJellyfishLayer } from './wordLearning/translationMatch/components/MatchJellyfishLayer';

const MATCH_JELLYFISH_Z = 4;

type TranslationMatchContentProps = {
  sounds: UnderseaThemeSoundController;
  sessionController: MatchSessionController;
};

function TranslationMatchContent({
  sounds,
  sessionController,
}: TranslationMatchContentProps) {
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
      <MatchKoiLayer
        words={englishWords}
        sounds={sounds}
        sessionController={sessionController}
      />
      <MatchJellyfishLayer words={spanishWords} zIndex={MATCH_JELLYFISH_Z} />
      <UnderseaThemeCornerControls helpVisible={false} />
    </View>
  );
}

function TranslationMatchContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();

  const sessionControllerRef = useRef<MatchSessionController | null>(null);
  if (sessionControllerRef.current == null) {
    sessionControllerRef.current = createMatchSessionController({
      pairCount: 8,
    });
  }

  useEffect(() => {
    const ctrl = sessionControllerRef.current;
    return () => {
      ctrl?.dispose();
    };
  }, []);

  return (
    <UnderseaThemeRuntimeProvider>
      <UnderseaThemeClockProvider>
        <TranslationMatchContent
          sounds={sounds}
          sessionController={sessionControllerRef.current}
        />
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
