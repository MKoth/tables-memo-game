import React from 'react';
import { UnderseaThemeWordLearningTranslationSpellingExercise } from './themes/undersea';
import { ThemeProvider } from './themeContract';
import { underseaTheme } from './themes/undersea';

export function TableWordLearningTranslationSpellingExercise() {
  return (
    <ThemeProvider theme={underseaTheme}>
      <UnderseaThemeWordLearningTranslationSpellingExercise />
    </ThemeProvider>
  );
}
