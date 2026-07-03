import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { UnderseaThemeBackground } from './background';
import {
  UnderseaThemeClockProvider,
  WORD_TRANSFORMATION_STORE_CONFIG,
  useUnderseaThemeAssetsContext,
  useUnderseaThemeExerciseStore,
} from './core';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { UnderseaThemeExerciseShell } from './shared/UnderseaThemeExerciseShell';

type UnderseaThemeWordTransformationContentProps = {
  sounds: UnderseaThemeSoundController;
};

function UnderseaThemeWordTransformationContent({
  sounds,
}: UnderseaThemeWordTransformationContentProps) {
  const soundEnabled = useUnderseaThemeExerciseStore((state) => state.soundEnabled);

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
    <UnderseaThemeClockProvider>
      <View style={styles.container}>
        <UnderseaThemeBackground />
      </View>
    </UnderseaThemeClockProvider>
  );
}

function UnderseaThemeWordTransformationContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();
  return <UnderseaThemeWordTransformationContent sounds={sounds} />;
}

export function UnderseaThemeTableWordTransformationExercise() {
  return (
    <UnderseaThemeExerciseShell storeConfig={WORD_TRANSFORMATION_STORE_CONFIG}>
      <UnderseaThemeWordTransformationContentWithSounds />
    </UnderseaThemeExerciseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
