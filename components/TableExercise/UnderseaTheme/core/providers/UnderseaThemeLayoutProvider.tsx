import React, { createContext, useContext, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  computeUnderseaLayout,
  type UnderseaLayout,
} from './underseaLayout';
import { useDeviceOrientation } from './useDeviceOrientation';

const UnderseaLayoutContext = createContext<UnderseaLayout | null>(null);

export function UnderseaLayoutProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const orientation = useDeviceOrientation();

  const layout = useMemo(
    () => computeUnderseaLayout(width, height, orientation),
    [width, height, orientation],
  );

  return (
    <UnderseaLayoutContext.Provider value={layout}>
      {children}
    </UnderseaLayoutContext.Provider>
  );
}

export function useUnderseaLayout(): UnderseaLayout {
  const layout = useContext(UnderseaLayoutContext);
  if (layout == null) {
    throw new Error('useUnderseaLayout must be used within UnderseaLayoutProvider');
  }
  return layout;
}
