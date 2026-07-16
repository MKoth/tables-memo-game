import React from 'react';
import { UnderseaThemeWordLearningTranslationMatchExercise } from './themes/undersea';
import { ThemeProvider } from './themeContract';
import { underseaTheme } from './themes/undersea';

export function TableWordLearningTranslationMatchExercise() {
  return (
    <ThemeProvider theme={underseaTheme}>
      <UnderseaThemeWordLearningTranslationMatchExercise />
    </ThemeProvider>
  );
}
