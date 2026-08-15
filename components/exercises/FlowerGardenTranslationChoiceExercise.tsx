import React from 'react';
import { FlowerGardenThemeTableTranslationChoiceExercise } from './themes/flower-garden';
import { ThemeProvider } from './themeContract';
import { flowerGardenTheme } from './themes/flower-garden';

export function FlowerGardenTranslationChoiceExercise() {
  return (
    <ThemeProvider theme={flowerGardenTheme}>
      <FlowerGardenThemeTableTranslationChoiceExercise />
    </ThemeProvider>
  );
}
