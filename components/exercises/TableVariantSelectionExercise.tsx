import React from 'react';
import { UnderseaThemeTableVariantSelectionExercise } from './themes/undersea';
import { ThemeProvider } from './themeContract';
import { underseaTheme } from './themes/undersea';

export function TableVariantSelectionExercise() {
  return (
    <ThemeProvider theme={underseaTheme}>
      <UnderseaThemeTableVariantSelectionExercise />
    </ThemeProvider>
  );
}
