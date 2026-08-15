import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
import { allWordLists } from '../../../../data/wordsData';
import {
  ExerciseClockProvider,
  ExerciseLayoutProvider,
  ExerciseRuntimeProvider,
  WORD_LEARNING_STORE_CONFIG,
  useExerciseLayout,
  useExerciseStore,
  type ExerciseZoneRatios,
} from '../../core';
import { useFlowerGardenAssetsContext } from './core/providers/FlowerGardenAssetsProvider';
import type { FlowerGardenSoundController } from './core/assets/useFlowerGardenThemeSounds';
import { useFieldFlowerConfigs } from './scenery/FieldFlowerShaderLayer/useFieldFlowerConfigs';
import { FlowerGardenScenery } from './scenery/FlowerGardenScenery';
import { FlowerGardenTableProvider } from './scenery/flowerGardenTableContext';
import { ExerciseShell } from '../../shared';
import { ExerciseCornerControls } from '../../ui';
import type { KeepOutDisk } from '../../wordLearning/translationMatch/domain/wordSpriteRoaming';
import { sampleMatchSession } from '../../wordLearning/translationMatch/domain/sampleMatchSession';
import {
  createMatchSessionController,
  type MatchSessionController,
} from '../../wordLearning/translationMatch/domain/matchSessionController';
import { TINT_FLASH_MS } from './carrier/FlowerGardenWordSpriteTableLayer/config/flowerTableLayerConfig';
import { FlowerGardenMatchRoamerLayer } from './exercises/wordLearning/translationMatch/components/FlowerGardenMatchRoamerLayer';
import { FlowerGardenMatchWordSpriteLayer } from './exercises/wordLearning/translationMatch/components/FlowerGardenMatchWordSpriteLayer';
import {
  useFlowerGardenCombinedMatchGestures,
  type FlowerGardenMatchRoamerTapData,
  type FlowerGardenMatchRoseTapData,
} from './exercises/wordLearning/translationMatch/flowerGarden/useFlowerGardenCombinedMatchGestures';

const FULL_SCREEN_ZONE_RATIOS: ExerciseZoneRatios = {
  roamerFraction: 1,
  wordSpriteInsetRatio: 0,
  wordSpriteHeightFraction: 1,
};

const MATCH_ROSE_Z = 4;
const SCENERY_Z = 1;
const GESTURE_Z = 10;

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
  sounds: FlowerGardenSoundController;
  sessionController: MatchSessionController;
  capturedEnglishSv: SharedValue<string>;
  matchedIndicesSv: SharedValue<number[]>;
  englishWordsByIndexSv: SharedValue<string[]>;
  exitTargetsSv: SharedValue<Record<number, { tx: number; ty: number }>>;
  keepOutDiskSv: SharedValue<KeepOutDisk | null>;
  roseEscapeWaypointSv: SharedValue<{ x: number; y: number } | null>;
};

function TranslationMatchContent({
  sounds,
  sessionController,
  capturedEnglishSv,
  matchedIndicesSv,
  englishWordsByIndexSv,
  exitTargetsSv,
  keepOutDiskSv,
  roseEscapeWaypointSv,
}: TranslationMatchContentProps) {
  const soundEnabled = useExerciseStore(state => state.soundEnabled);
  const { screenWidth, screenHeight } = useExerciseLayout();

  const entries = useMemo(() => sampleMatchSession(allWordLists), []);
  const englishWords = useMemo(() => entries.map(e => e.english), [entries]);
  const spanishWords = useMemo(() => entries.map(e => e.spanish), [entries]);

  useEffect(() => {
    englishWordsByIndexSv.value = englishWords;
  }, [englishWords, englishWordsByIndexSv]);

  const triggerEscapeRef = useRef<(() => void) | null>(null);
  const exitTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const wordSpriteTapDataRef = useRef<FlowerGardenMatchRoseTapData | null>(null);
  const roamerTapDataRef = useRef<FlowerGardenMatchRoamerTapData | null>(null);

  const handleCorrectMatchJs = useCallback(
    (hitIdx: number) => {
      sessionController.correctMatch(hitIdx);
      sessionController.resolveComplete();
      const snapshot = sessionController.getSnapshot();
      capturedEnglishSv.value = '';
      matchedIndicesSv.value = snapshot.matchedIndices;
      sounds.playSuccessClick();
      sounds.playOrbPop();

      const jx = wordSpriteTapDataRef.current?.layoutX.value[hitIdx] ?? screenWidth * 0.5;
      const jy = wordSpriteTapDataRef.current?.layoutY.value[hitIdx] ?? screenHeight * 0.5;
      roseEscapeWaypointSv.value = { x: jx, y: jy };
      triggerEscapeRef.current?.();

      const timer = setTimeout(() => {
        const target = closestOffscreenTarget(jx, jy, screenWidth, screenHeight);
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
      roseEscapeWaypointSv,
      exitTargetsSv,
      screenWidth,
      screenHeight,
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

  const combinedGesture = useFlowerGardenCombinedMatchGestures({
    wordSpriteTapDataRef,
    roamerTapDataRef,
    onCorrectMatchJs: handleCorrectMatchJs,
    onWrongMatchJs: handleWrongMatchJs,
    onNeutralTapJs: handleNeutralTapJs,
  });

  useEffect(() => {
    sounds.startAmbient();
    return () => {
      sounds.stopAmbient();
    };
  }, [sounds]);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [sounds, soundEnabled]);

  return (
    <View style={styles.container}>
      <View style={[styles.fullLayer, { zIndex: SCENERY_Z }]} pointerEvents="none">
        <FlowerGardenScenery />
      </View>
      <FlowerGardenMatchRoamerLayer
        words={englishWords}
        sounds={sounds}
        sessionController={sessionController}
        triggerEscapeRef={triggerEscapeRef}
        tapDataRef={roamerTapDataRef}
        interactive={false}
        keepOutDiskSv={keepOutDiskSv}
        escapeWaypointSv={roseEscapeWaypointSv}
      />
      <FlowerGardenMatchWordSpriteLayer
        words={spanishWords}
        zIndex={MATCH_ROSE_Z}
        capturedEnglishSv={capturedEnglishSv}
        matchedIndicesSv={matchedIndicesSv}
        englishWordsByIndexSv={englishWordsByIndexSv}
        exitTargetsSv={exitTargetsSv}
        tapDataRef={wordSpriteTapDataRef}
        keepOutDiskSv={keepOutDiskSv}
      />
      <GestureDetector gesture={combinedGesture}>
        <View style={[StyleSheet.absoluteFill, styles.gestureCapture, { zIndex: GESTURE_Z }]} />
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
  const { sounds } = useFlowerGardenAssetsContext();

  const capturedEnglishSv = useSharedValue('');
  const matchedIndicesSv = useSharedValue<number[]>([]);
  const englishWordsByIndexSv = useSharedValue<string[]>([]);
  const exitTargetsSv = useSharedValue<Record<number, { tx: number; ty: number }>>({});
  const keepOutDiskSv = useSharedValue<KeepOutDisk | null>(null);
  const roseEscapeWaypointSv = useSharedValue<{ x: number; y: number } | null>(null);

  const fieldFlowerConfigs = useFieldFlowerConfigs({
    count: 20,
    bandTopRatio: 0.25,
    bandHeightRatio: 0.5,
  });
  const flowerSwingBoosts = useSharedValue<number[]>([]);

  useEffect(() => {
    flowerSwingBoosts.value = new Array(Math.max(fieldFlowerConfigs.length, 1)).fill(0);
  }, [fieldFlowerConfigs.length, flowerSwingBoosts]);

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
        <FlowerGardenTableProvider
          value={{
            table: null,
            fieldFlowerConfigs,
            flowerSwingBoosts,
            earthMaskConfig: null,
          }}>
          <TranslationMatchContent
            sounds={sounds}
            sessionController={sessionController}
            capturedEnglishSv={capturedEnglishSv}
            matchedIndicesSv={matchedIndicesSv}
            englishWordsByIndexSv={englishWordsByIndexSv}
            exitTargetsSv={exitTargetsSv}
            keepOutDiskSv={keepOutDiskSv}
            roseEscapeWaypointSv={roseEscapeWaypointSv}
          />
        </FlowerGardenTableProvider>
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
  );
}

export function FlowerGardenThemeTableTranslationMatchExercise() {
  return (
    <ExerciseShell storeConfig={WORD_LEARNING_STORE_CONFIG}>
      <ExerciseLayoutProvider zoneRatios={FULL_SCREEN_ZONE_RATIOS}>
        <TranslationMatchContentWithSounds />
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
  gestureCapture: {
    zIndex: GESTURE_Z,
  },
});
