import React, { createContext, useContext } from 'react';
import type { SwampThemeImages } from '../assets/swampThemeAssets';

export type SwampThemeAssetsContextValue = {
  images: SwampThemeImages;
};

const SwampThemeAssetsContext = createContext<SwampThemeAssetsContextValue | null>(null);

type SwampThemeAssetsProviderProps = {
  value: SwampThemeAssetsContextValue;
  children: React.ReactNode;
};

export function SwampThemeAssetsProvider({
  value,
  children,
}: SwampThemeAssetsProviderProps) {
  return (
    <SwampThemeAssetsContext.Provider value={value}>
      {children}
    </SwampThemeAssetsContext.Provider>
  );
}

export function useSwampThemeAssetsContext(): SwampThemeAssetsContextValue {
  const context = useContext(SwampThemeAssetsContext);
  if (context == null) {
    throw new Error('useSwampThemeAssetsContext must be used within SwampThemeAssetsProvider');
  }
  return context;
}
