import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { getTableBodyWords, spanishPresentTable2Singular } from '../../../data/tableData';
import { UnderseaThemeBackground } from './background';
import {
  UnderseaThemeClockProvider,
  UnderseaThemeRuntimeProvider,
  TABLE_EXERCISE_STORE_CONFIG,
  useUnderseaThemeAssetsContext,
  useUnderseaThemeExerciseStore,
} from './core';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { JellyfishTableLayer, type JellyfishSoundKind } from './jellyfish';
import { KoiSwimZone } from './koi';
import { UnderseaThemeExerciseShell } from './shared/UnderseaThemeExerciseShell';
import {
  CaptureOverlay,
  UnderseaThemeCornerControls,
  UnderseaThemeInstructions,
} from './ui';

const JELLYFISH_LAYER_Z = 5;

type UnderseaThemeExerciseContentProps = {
  sounds: UnderseaThemeSoundController;
};

function UnderseaThemeExerciseContent({ sounds }: UnderseaThemeExerciseContentProps) {
  const table = spanishPresentTable2Singular;
  const words = useMemo(() => getTableBodyWords(table), [table]);
  const tutorialStep = useUnderseaThemeExerciseStore((state) => state.tutorialStep);
  const soundEnabled = useUnderseaThemeExerciseStore((state) => state.soundEnabled);
  const tutorialActive = tutorialStep !== 'idle';

  const handleJellyfishSound = useCallback((kind: JellyfishSoundKind) => {
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
    <UnderseaThemeRuntimeProvider>
      <UnderseaThemeClockProvider>
        <View style={styles.container}>
          <UnderseaThemeBackground />
          <KoiSwimZone
            words={words}
            interactive={!tutorialActive}
            sounds={sounds}
          />
          <CaptureOverlay />
          <View style={styles.jellyfishLayer} pointerEvents="box-none">
            <JellyfishTableLayer
              table={table}
              onJellyfishSound={handleJellyfishSound}
              interactive={!tutorialActive}
            />
          </View>
          {tutorialActive && <UnderseaThemeInstructions />}
          <UnderseaThemeCornerControls />
        </View>
      </UnderseaThemeClockProvider>
    </UnderseaThemeRuntimeProvider>
  );
}

function UnderseaThemeExerciseContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();
  return <UnderseaThemeExerciseContent sounds={sounds} />;
}

export function UnderseaThemeTableExercise() {
  return (
    <UnderseaThemeExerciseShell storeConfig={TABLE_EXERCISE_STORE_CONFIG}>
      <UnderseaThemeExerciseContentWithSounds />
    </UnderseaThemeExerciseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  jellyfishLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: JELLYFISH_LAYER_Z,
  },
});
