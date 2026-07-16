import React from 'react';
import { UnderseaThemeTableSentenceTransformationExercise } from './themes/undersea';
import { ThemeProvider } from './themeContract';
import { underseaTheme } from './themes/undersea';

export function TableSentenceTransformationExercise() {
  return (
    <ThemeProvider theme={underseaTheme}>
      <UnderseaThemeTableSentenceTransformationExercise />
    </ThemeProvider>
  );
}
