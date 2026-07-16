import React, { createContext, useContext } from 'react';
import type { UnderseaThemeImages } from '../assets/underseaThemeAssets';
import type { UnderseaThemeSoundController } from '../assets/useUnderseaThemeSounds';

export type UnderseaThemeAssetsContextValue = {
  images: UnderseaThemeImages;
  sounds: UnderseaThemeSoundController;
};

const UnderseaThemeAssetsContext = createContext<UnderseaThemeAssetsContextValue | null>(null);

type UnderseaThemeAssetsProviderProps = {
  value: UnderseaThemeAssetsContextValue;
  children: React.ReactNode;
};

export function UnderseaThemeAssetsProvider({
  value,
  children,
}: UnderseaThemeAssetsProviderProps) {
  return (
    <UnderseaThemeAssetsContext.Provider value={value}>
      {children}
    </UnderseaThemeAssetsContext.Provider>
  );
}

export function useUnderseaThemeAssetsContext(): UnderseaThemeAssetsContextValue {
  const context = useContext(UnderseaThemeAssetsContext);
  if (context == null) {
    throw new Error('useUnderseaThemeAssetsContext must be used within UnderseaThemeAssetsProvider');
  }
  return context;
}
