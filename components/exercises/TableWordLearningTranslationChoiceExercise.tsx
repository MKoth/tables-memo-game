import React from 'react';
import { UnderseaThemeWordLearningTranslationChoiceExercise } from './themes/undersea';
import { ThemeProvider } from './themeContract';
import { underseaTheme } from './themes/undersea';

export function TableWordLearningTranslationChoiceExercise() {
  return (
    <ThemeProvider theme={underseaTheme}>
      <UnderseaThemeWordLearningTranslationChoiceExercise />
    </ThemeProvider>
  );
}
