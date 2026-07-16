import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { getTableBodyWords, spanishPresentTable2Plural } from '../../../../data/tableData';
import { UnderseaThemeScenery } from './scenery';
import {
  ExerciseClockProvider,
  ExerciseRuntimeProvider,
  TABLE_EXERCISE_STORE_CONFIG,
  useExerciseStore,
} from '../../core';
import { useUnderseaThemeAssetsContext } from './core/providers/UnderseaThemeAssetsProvider';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { WordSpriteTableLayer, type WordSpriteSoundKind } from './carrier';
import { RoamerSwimZone } from './roamer';
import { ExerciseShell } from '../../shared';
import { CaptureOverlay, ExerciseCornerControls } from '../../ui';
import { UnderseaThemeInstructions } from './ui';

const WORD_SPRITE_LAYER_Z = 5;

type UnderseaThemeExerciseContentProps = {
  sounds: UnderseaThemeSoundController;
};

function UnderseaThemeExerciseContent({ sounds }: UnderseaThemeExerciseContentProps) {
  const table = spanishPresentTable2Plural;
  const words = useMemo(() => getTableBodyWords(table), [table]);
  const tutorialStep = useExerciseStore((state) => state.tutorialStep);
  const soundEnabled = useExerciseStore((state) => state.soundEnabled);
  const tutorialActive = tutorialStep !== 'idle';

  const handleWordSpriteSound = useCallback((kind: WordSpriteSoundKind) => {
    if (kind === 'success') {
      sounds.playSuccessClick();
      return;
    }
    if (kind === 'error') {
      sounds.playWrongClick();
      return;
    }
    sounds.playPrimaryClick();
  }, [sounds]);

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
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <View style={styles.container}>
          <UnderseaThemeScenery />
          <RoamerSwimZone
            words={words}
            interactive={!tutorialActive}
            sounds={sounds}
          />
          <CaptureOverlay />
          <View style={styles.wordSpriteLayer} pointerEvents="box-none">
            <WordSpriteTableLayer
              table={table}
              onWordSpriteSound={handleWordSpriteSound}
              interactive={!tutorialActive}
            />
          </View>
          {tutorialActive && <UnderseaThemeInstructions />}
          <ExerciseCornerControls />
        </View>
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
  );
}

function UnderseaThemeExerciseContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();
  return <UnderseaThemeExerciseContent sounds={sounds} />;
}

export function UnderseaThemeTableExercise() {
  return (
    <ExerciseShell storeConfig={TABLE_EXERCISE_STORE_CONFIG}>
      <UnderseaThemeExerciseContentWithSounds />
    </ExerciseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
