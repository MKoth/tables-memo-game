import React from 'react';
import { UnderseaThemeTableWordTransformationExercise } from './themes/undersea';
import { ThemeProvider } from './themeContract';
import { underseaTheme } from './themes/undersea';

export function TableWordTransformationExercise() {
  return (
    <ThemeProvider theme={underseaTheme}>
      <UnderseaThemeTableWordTransformationExercise />
    </ThemeProvider>
  );
}
