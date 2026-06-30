import React, { createContext, useContext } from 'react';
import type { UnderseaImages } from './underseaAssets';
import type { UnderseaSoundController } from './useUnderseaSounds';

export type UnderseaAssetsContextValue = {
  images: UnderseaImages;
  sounds: UnderseaSoundController;
};

const UnderseaAssetsContext = createContext<UnderseaAssetsContextValue | null>(null);

type UnderseaAssetsProviderProps = {
  value: UnderseaAssetsContextValue;
  children: React.ReactNode;
};

export function UnderseaAssetsProvider({ value, children }: UnderseaAssetsProviderProps) {
  return (
    <UnderseaAssetsContext.Provider value={value}>
      {children}
    </UnderseaAssetsContext.Provider>
  );
}

export function useUnderseaAssetsContext(): UnderseaAssetsContextValue {
  const context = useContext(UnderseaAssetsContext);
  if (context == null) {
    throw new Error('useUnderseaAssetsContext must be used within UnderseaAssetsProvider');
  }
  return context;
}
