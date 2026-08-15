import React from 'react';
import { FlowerGardenThemeTableTranslationSpellingExercise } from './themes/flower-garden';
import { ThemeProvider } from './themeContract';
import { flowerGardenTheme } from './themes/flower-garden';

export function FlowerGardenTranslationSpellingExercise() {
  return (
    <ThemeProvider theme={flowerGardenTheme}>
      <FlowerGardenThemeTableTranslationSpellingExercise />
    </ThemeProvider>
  );
}
