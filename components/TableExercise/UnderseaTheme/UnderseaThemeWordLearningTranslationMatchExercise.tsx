import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
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
import { TINT_FLASH_MS } from './jellyfish/JellyfishTableLayer/config/jellyfishTableLayerConfig';
import { MatchKoiLayer } from './wordLearning/translationMatch/components/MatchKoiLayer';
import { MatchJellyfishLayer } from './wordLearning/translationMatch/components/MatchJellyfishLayer';

const MATCH_JELLYFISH_Z = 4;

function randomOffscreenTarget(
  width: number,
  height: number,
): { tx: number; ty: number } {
  const margin = 200;
  const edge = Math.floor(Math.random() * 4);
  switch (edge) {
    case 0:
      return { tx: -margin, ty: Math.random() * height };
    case 1:
      return { tx: width + margin, ty: Math.random() * height };
    case 2:
      return { tx: Math.random() * width, ty: -margin };
    default:
      return { tx: Math.random() * width, ty: height + margin };
  }
}

type TranslationMatchContentProps = {
  sounds: UnderseaThemeSoundController;
  sessionController: MatchSessionController;
  capturedEnglishSv: SharedValue<string>;
  matchedIndicesSv: SharedValue<number[]>;
  englishWordsByIndexSv: SharedValue<string[]>;
  exitTargetsSv: SharedValue<Record<number, { tx: number; ty: number }>>;
};

function TranslationMatchContent({
  sounds,
  sessionController,
  capturedEnglishSv,
  matchedIndicesSv,
  englishWordsByIndexSv,
  exitTargetsSv,
}: TranslationMatchContentProps) {
  const soundEnabled = useUnderseaThemeExerciseStore(state => state.soundEnabled);
  const { width, height } = useWindowDimensions();

  const entries = useMemo(() => sampleMatchSession(allWordLists), []);
  const englishWords = useMemo(() => entries.map(e => e.english), [entries]);
  const spanishWords = useMemo(() => entries.map(e => e.spanish), [entries]);

  useEffect(() => {
    englishWordsByIndexSv.value = englishWords;
  }, [englishWords, englishWordsByIndexSv]);

  const triggerEscapeRef = useRef<(() => void) | null>(null);

  const exitTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = exitTimersRef.current;
    return () => {
      timers.forEach(t => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const handleCorrectMatchJs = useCallback(
    (hitIdx: number) => {
      sessionController.correctMatch(hitIdx);
      sessionController.resolveComplete();
      const snapshot = sessionController.getSnapshot();
      capturedEnglishSv.value = '';
      matchedIndicesSv.value = snapshot.matchedIndices;
      sounds.playSuccessClick();
      sounds.playBubblePop();
      triggerEscapeRef.current?.();

      const timer = setTimeout(() => {
        const target = randomOffscreenTarget(width, height);
        const current = { ...exitTargetsSv.value };
        current[hitIdx] = target;
        exitTargetsSv.value = current;
        exitTimersRef.current.delete(hitIdx);
      }, TINT_FLASH_MS);
      exitTimersRef.current.set(hitIdx, timer);
    },
    [
      sessionController,
      capturedEnglishSv,
      matchedIndicesSv,
      sounds,
      exitTargetsSv,
      width,
      height,
    ],
  );

  const handleWrongMatchJs = useCallback(
    (_hitIdx: number) => {
      sessionController.wrongMatch();
      sounds.playWrongClick();
    },
    [sessionController, sounds],
  );

  const handleNeutralTapJs = useCallback(
    (_hitIdx: number) => {
      sounds.playPrimaryClick();
    },
    [sounds],
  );

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
        triggerEscapeRef={triggerEscapeRef}
      />
      <MatchJellyfishLayer
        words={spanishWords}
        zIndex={MATCH_JELLYFISH_Z}
        capturedEnglishSv={capturedEnglishSv}
        matchedIndicesSv={matchedIndicesSv}
        englishWordsByIndexSv={englishWordsByIndexSv}
        exitTargetsSv={exitTargetsSv}
        onCorrectMatchJs={handleCorrectMatchJs}
        onWrongMatchJs={handleWrongMatchJs}
        onNeutralTapJs={handleNeutralTapJs}
      />
      <UnderseaThemeCornerControls helpVisible={false} />
    </View>
  );
}

function useSyncedSessionController(
  capturedEnglishSv: SharedValue<string>,
  matchedIndicesSv: SharedValue<number[]>,
): MatchSessionController {
  const ctrlRef = useRef<MatchSessionController | null>(null);

  if (ctrlRef.current == null) {
    ctrlRef.current = createMatchSessionController({
      pairCount: 8,
      onPhaseChange: () => {
        const ctrl = ctrlRef.current;
        if (ctrl == null) {
          return;
        }
        const snapshot = ctrl.getSnapshot();
        capturedEnglishSv.value = snapshot.capturedEnglish ?? '';
        matchedIndicesSv.value = snapshot.matchedIndices;
      },
    });
  }

  useEffect(() => {
    const ctrl = ctrlRef.current;
    return () => {
      ctrl?.dispose();
    };
  }, []);

  return ctrlRef.current;
}

function TranslationMatchContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();

  const capturedEnglishSv = useSharedValue('');
  const matchedIndicesSv = useSharedValue<number[]>([]);
  const englishWordsByIndexSv = useSharedValue<string[]>([]);
  const exitTargetsSv = useSharedValue<Record<number, { tx: number; ty: number }>>({});

  const sessionController = useSyncedSessionController(
    capturedEnglishSv,
    matchedIndicesSv,
  );

  return (
    <UnderseaThemeRuntimeProvider>
      <UnderseaThemeClockProvider>
        <TranslationMatchContent
          sounds={sounds}
          sessionController={sessionController}
          capturedEnglishSv={capturedEnglishSv}
          matchedIndicesSv={matchedIndicesSv}
          englishWordsByIndexSv={englishWordsByIndexSv}
          exitTargetsSv={exitTargetsSv}
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
