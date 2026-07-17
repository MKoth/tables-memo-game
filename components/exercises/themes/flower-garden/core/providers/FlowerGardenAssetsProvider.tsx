import React, { createContext, useContext } from 'react';
import type { FlowerGardenSoundController } from '../assets/useFlowerGardenThemeSounds';
import type { FlowerGardenThemeImages } from '../assets/flowerGardenThemeAssets';

export type FlowerGardenAssetsContextValue = {
  images: FlowerGardenThemeImages;
  sounds: FlowerGardenSoundController;
};

const FlowerGardenAssetsContext = createContext<FlowerGardenAssetsContextValue | null>(null);

type FlowerGardenAssetsProviderProps = {
  value: FlowerGardenAssetsContextValue;
  children: React.ReactNode;
};

export function FlowerGardenAssetsProvider({
  value,
  children,
}: FlowerGardenAssetsProviderProps) {
  return (
    <FlowerGardenAssetsContext.Provider value={value}>
      {children}
    </FlowerGardenAssetsContext.Provider>
  );
}

export function useFlowerGardenAssetsContext(): FlowerGardenAssetsContextValue {
  const context = useContext(FlowerGardenAssetsContext);
  if (context == null) {
    throw new Error('useFlowerGardenAssetsContext must be used within FlowerGardenAssetsProvider');
  }
  return context;
}
