import React, { type ReactNode } from 'react';
import { ExerciseLayoutProvider } from '../core/providers/ExerciseLayoutProvider';
import {
  ExerciseStoreProvider,
  type ExerciseStoreConfig,
} from '../core/store/createExerciseStore';
import { useTheme } from '../themeContract';
import { ExerciseLoadingScreen } from './ExerciseLoadingScreen';

export type ExerciseShellProps = {
  storeConfig: ExerciseStoreConfig;
  children: ReactNode;
};

function ExerciseShellContent({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const assets = theme.assets.useThemeAssets();

  if (assets.phase !== 'ready') {
    return (
      <ExerciseLoadingScreen
        progress={assets.progress}
        seafloorImage={assets.seafloorImage}
        stoneImages={assets.stoneImages}
        seaweedImages={assets.seaweedImages}
      />
    );
  }

  return (
    <theme.assets.AssetsProvider
      value={{ images: assets.images, sounds: assets.sounds }}>
      {children}
    </theme.assets.AssetsProvider>
  );
}

export function ExerciseShell({
  storeConfig,
  children,
}: ExerciseShellProps) {
  return (
    <ExerciseStoreProvider config={storeConfig}>
      <ExerciseLayoutProvider>
        <ExerciseShellContent>{children}</ExerciseShellContent>
      </ExerciseLayoutProvider>
    </ExerciseStoreProvider>
  );
}
