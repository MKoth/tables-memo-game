import React from 'react';
import { SwampThemeTableExercise } from './themes/swamp';
import { ThemeProvider } from './themeContract';
import { swampTheme } from './themes/swamp';

export function SwampTableExercise() {
  return (
    <ThemeProvider theme={swampTheme}>
      <SwampThemeTableExercise />
    </ThemeProvider>
  );
}
