import React from 'react';
import { FlowerGardenThemeTableVariantSelectionExercise } from './themes/flower-garden';
import { ThemeProvider } from './themeContract';
import { flowerGardenTheme } from './themes/flower-garden';

export function FlowerGardenVariantSelectionExercise() {
  return (
    <ThemeProvider theme={flowerGardenTheme}>
      <FlowerGardenThemeTableVariantSelectionExercise />
    </ThemeProvider>
  );
}
