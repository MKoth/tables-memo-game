import React, { type ReactNode } from 'react';
import { useUnderseaThemeAssets } from '../core/assets/useUnderseaThemeAssets';
import { UnderseaThemeAssetsProvider } from '../core/providers/UnderseaThemeAssetsProvider';
import { ExerciseLayoutProvider } from '../../core/providers/ExerciseLayoutProvider';
import {
  ExerciseStoreProvider,
  type ExerciseStoreConfig,
} from '../../core/store/createExerciseStore';
import { UnderseaThemeLoadingScreen } from '../ui/loading/UnderseaThemeLoadingScreen';

export type UnderseaThemeExerciseShellProps = {
  storeConfig: ExerciseStoreConfig;
  children: ReactNode;
};

function UnderseaThemeExerciseShellContent({ children }: { children: ReactNode }) {
  const assets = useUnderseaThemeAssets();

  if (assets.phase !== 'ready') {
    return (
      <UnderseaThemeLoadingScreen
        seafloorImage={assets.seafloorImage}
        stoneImages={assets.stoneImages}
        seaweedImages={assets.seaweedImages}
        progress={assets.progress}
      />
    );
  }

  return (
    <UnderseaThemeAssetsProvider value={{ images: assets.images, sounds: assets.sounds }}>
      {children}
    </UnderseaThemeAssetsProvider>
  );
}

export function UnderseaThemeExerciseShell({
  storeConfig,
  children,
}: UnderseaThemeExerciseShellProps) {
  return (
    <ExerciseStoreProvider config={storeConfig}>
      <ExerciseLayoutProvider>
        <UnderseaThemeExerciseShellContent>{children}</UnderseaThemeExerciseShellContent>
      </ExerciseLayoutProvider>
    </ExerciseStoreProvider>
  );
}
