import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { UnderseaThemeBackground } from './background';
import {
  UnderseaThemeClockProvider,
  UnderseaThemeLayoutProvider,
  UnderseaThemeAssetsProvider,
  useUnderseaThemeAssets,
  useUnderseaThemeExerciseStore,
} from './core';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { UnderseaThemeLoadingScreen } from './ui';

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

export function UnderseaThemeTableWordTransformationExercise() {
  const assets = useUnderseaThemeAssets();

  return (
    <UnderseaThemeLayoutProvider>
      {assets.phase !== 'ready' ? (
        <UnderseaThemeLoadingScreen
          seafloorImage={assets.seafloorImage}
          stoneImages={assets.stoneImages}
          seaweedImages={assets.seaweedImages}
          progress={assets.progress}
        />
      ) : (
        <UnderseaThemeAssetsProvider value={{ images: assets.images, sounds: assets.sounds }}>
          <UnderseaThemeWordTransformationContent sounds={assets.sounds} />
        </UnderseaThemeAssetsProvider>
      )}
    </UnderseaThemeLayoutProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
