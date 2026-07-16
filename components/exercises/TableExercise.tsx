import React from 'react';
import { UnderseaThemeTableExercise } from './themes/undersea';
import { ThemeProvider } from './themeContract';
import { underseaTheme } from './themes/undersea';

export function TableExercise() {
  return (
    <ThemeProvider theme={underseaTheme}>
      <UnderseaThemeTableExercise />
    </ThemeProvider>
  );
}
