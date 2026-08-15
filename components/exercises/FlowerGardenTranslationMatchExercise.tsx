import React from 'react';
import { FlowerGardenThemeTableTranslationMatchExercise } from './themes/flower-garden';
import { ThemeProvider } from './themeContract';
import { flowerGardenTheme } from './themes/flower-garden';

export function FlowerGardenTranslationMatchExercise() {
  return (
    <ThemeProvider theme={flowerGardenTheme}>
      <FlowerGardenThemeTableTranslationMatchExercise />
    </ThemeProvider>
  );
}
