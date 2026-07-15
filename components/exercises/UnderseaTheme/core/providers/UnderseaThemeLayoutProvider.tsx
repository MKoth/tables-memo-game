import React, { createContext, useContext, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  computeUnderseaThemeLayout,
  type UnderseaThemeLayout,
} from '../layout/computeUnderseaThemeLayout';
import { useUnderseaThemeDeviceOrientation } from '../layout/useUnderseaThemeDeviceOrientation';

const UnderseaThemeLayoutContext = createContext<UnderseaThemeLayout | null>(null);

export function UnderseaThemeLayoutProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const orientation = useUnderseaThemeDeviceOrientation();

  const layout = useMemo(
    () => computeUnderseaThemeLayout(width, height, orientation),
    [width, height, orientation],
  );

  return (
    <UnderseaThemeLayoutContext.Provider value={layout}>
      {children}
    </UnderseaThemeLayoutContext.Provider>
  );
}

export function useUnderseaThemeLayout(): UnderseaThemeLayout {
  const layout = useContext(UnderseaThemeLayoutContext);
  if (layout == null) {
    throw new Error('useUnderseaThemeLayout must be used within UnderseaThemeLayoutProvider');
  }
  return layout;
}
