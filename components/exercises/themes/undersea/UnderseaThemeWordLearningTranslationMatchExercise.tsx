import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { allWordLists } from '../../../../data/wordsData';
import { UnderseaThemeScenery } from './scenery';
import {
  ExerciseClockProvider,
  ExerciseRuntimeProvider,
  WORD_LEARNING_STORE_CONFIG,
  useExerciseStore,
} from '../../core';
import { useUnderseaThemeAssetsContext } from './core/providers/UnderseaThemeAssetsProvider';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { ExerciseShell } from '../../shared';
import { ExerciseCornerControls } from '../../ui';
import type { KeepOutDisk } from '../../wordLearning/translationMatch/domain/wordSpriteRoaming';
import { sampleMatchSession } from '../../wordLearning/translationMatch/domain/sampleMatchSession';
import {
  createMatchSessionController,
  type MatchSessionController,
} from '../../wordLearning/translationMatch/domain/matchSessionController';
import { TINT_FLASH_MS } from './carrier/WordSpriteTableLayer/config/wordSpriteTableLayerConfig';
import { MatchRoamerLayer } from './exercises/wordLearning/translationMatch/components/MatchRoamerLayer';
import { MatchWordSpriteLayer } from './exercises/wordLearning/translationMatch/components/MatchWordSpriteLayer';
import { useCombinedMatchGestures } from './exercises/wordLearning/translationMatch/wordSprite/useCombinedMatchGestures';
import type { WordSpriteTapData, RoamerTapData } from './exercises/wordLearning/translationMatch/wordSprite/useCombinedMatchGestures';

const MATCH_WORD_SPRITE_Z = 4;

function closestOffscreenTarget(
  x: number,
  y: number,
  width: number,
  height: number,
): { tx: number; ty: number } {
  const margin = 200;
  const distLeft = x;
  const distRight = width - x;
  const distTop = y;
  const distBottom = height - y;
  const min = Math.min(distLeft, distRight, distTop, distBottom);
  if (min === distLeft) {
    return { tx: -margin, ty: y };
  }
  if (min === distRight) {
    return { tx: width + margin, ty: y };
  }
  if (min === distTop) {
    return { tx: x, ty: -margin };
  }
  return { tx: x, ty: height + margin };
}

type TranslationMatchContentProps = {
  sounds: UnderseaThemeSoundController;
  sessionController: MatchSessionController;
  capturedEnglishSv: SharedValue<string>;
  matchedIndicesSv: SharedValue<number[]>;
  englishWordsByIndexSv: SharedValue<string[]>;
  exitTargetsSv: SharedValue<Record<number, { tx: number; ty: number }>>;
  keepOutDiskSv: SharedValue<KeepOutDisk | null>;
};

function TranslationMatchContent({
  sounds,
  sessionController,
  capturedEnglishSv,
  matchedIndicesSv,
  englishWordsByIndexSv,
  exitTargetsSv,
  keepOutDiskSv,
}: TranslationMatchContentProps) {
  const soundEnabled = useExerciseStore(state => state.soundEnabled);
  const { width, height } = useWindowDimensions();

  const entries = useMemo(() => sampleMatchSession(allWordLists), []);
  const englishWords = useMemo(() => entries.map(e => e.english), [entries]);
  const spanishWords = useMemo(() => entries.map(e => e.spanish), [entries]);

  useEffect(() => {
    englishWordsByIndexSv.value = englishWords;
  }, [englishWords, englishWordsByIndexSv]);

  const triggerEscapeRef = useRef<(() => void) | null>(null);

  const exitTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const wordSpriteTapDataRef = useRef<WordSpriteTapData | null>(null);
  const roamerTapDataRef = useRef<RoamerTapData | null>(null);

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
        const jx = wordSpriteTapDataRef.current?.layoutX.value[hitIdx] ?? width * 0.5;
        const jy = wordSpriteTapDataRef.current?.layoutY.value[hitIdx] ?? height * 0.5;
        const target = closestOffscreenTarget(jx, jy, width, height);
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

  const combinedGesture = useCombinedMatchGestures({
    wordSpriteTapDataRef,
    roamerTapDataRef,
    onCorrectMatchJs: handleCorrectMatchJs,
    onWrongMatchJs: handleWrongMatchJs,
    onNeutralTapJs: handleNeutralTapJs,
  });

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
      <UnderseaThemeScenery />
      <MatchRoamerLayer
        words={englishWords}
        sounds={sounds}
        sessionController={sessionController}
        triggerEscapeRef={triggerEscapeRef}
        tapDataRef={roamerTapDataRef}
        interactive={false}
        keepOutDiskSv={keepOutDiskSv}
      />
      <MatchWordSpriteLayer
        words={spanishWords}
        zIndex={MATCH_WORD_SPRITE_Z}
        capturedEnglishSv={capturedEnglishSv}
        matchedIndicesSv={matchedIndicesSv}
        englishWordsByIndexSv={englishWordsByIndexSv}
        exitTargetsSv={exitTargetsSv}
        tapDataRef={wordSpriteTapDataRef}
        keepOutDiskSv={keepOutDiskSv}
      />
      <GestureDetector gesture={combinedGesture}>
        <View style={[StyleSheet.absoluteFill, styles.gestureCapture]} pointerEvents="auto" />
      </GestureDetector>
      <ExerciseCornerControls helpVisible={false} />
    </View>
  );
}

function useSyncedSessionController(
  capturedEnglishSv: SharedValue<string>,
  matchedIndicesSv: SharedValue<number[]>,
  onSessionComplete?: () => void,
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
      onSessionComplete,
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
  const keepOutDiskSv = useSharedValue<KeepOutDisk | null>(null);

  const sessionController = useSyncedSessionController(
    capturedEnglishSv,
    matchedIndicesSv,
    () => {
      sounds.playFanfare();
    },
  );

  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <TranslationMatchContent
          sounds={sounds}
          sessionController={sessionController}
          capturedEnglishSv={capturedEnglishSv}
          matchedIndicesSv={matchedIndicesSv}
          englishWordsByIndexSv={englishWordsByIndexSv}
          exitTargetsSv={exitTargetsSv}
          keepOutDiskSv={keepOutDiskSv}
        />
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
  );
}

export function UnderseaThemeWordLearningTranslationMatchExercise() {
  return (
    <ExerciseShell storeConfig={WORD_LEARNING_STORE_CONFIG}>
      <TranslationMatchContentWithSounds />
    </ExerciseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gestureCapture: {
    zIndex: 10,
  },
});
