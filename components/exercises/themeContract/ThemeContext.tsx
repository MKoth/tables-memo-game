import React, { createContext, useContext } from 'react';
import type { Theme } from './Theme';

const ThemeContext = createContext<Theme | null>(null);

export type ThemeProviderProps = {
  theme: Theme;
  children: React.ReactNode;
};

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (theme == null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}
