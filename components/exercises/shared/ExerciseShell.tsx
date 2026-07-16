import React, { type ReactNode } from 'react';
import { useUnderseaThemeAssets } from '../themes/undersea/core/assets/useUnderseaThemeAssets';
import { UnderseaThemeAssetsProvider } from '../themes/undersea/core/providers/UnderseaThemeAssetsProvider';
import { ExerciseLayoutProvider } from '../core/providers/ExerciseLayoutProvider';
import {
  ExerciseStoreProvider,
  type ExerciseStoreConfig,
} from '../core/store/createExerciseStore';
import { UnderseaThemeLoadingScreen } from '../themes/undersea/ui/loading/UnderseaThemeLoadingScreen';

export type ExerciseShellProps = {
  storeConfig: ExerciseStoreConfig;
  children: ReactNode;
};

function ExerciseShellContent({ children }: { children: ReactNode }) {
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
