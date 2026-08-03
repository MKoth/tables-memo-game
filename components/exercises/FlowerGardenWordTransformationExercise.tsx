import React from 'react';
import { FlowerGardenThemeTableWordTransformationExercise } from './themes/flower-garden';
import { ThemeProvider } from './themeContract';
import { flowerGardenTheme } from './themes/flower-garden';

export function FlowerGardenWordTransformationExercise() {
  return (
    <ThemeProvider theme={flowerGardenTheme}>
      <FlowerGardenThemeTableWordTransformationExercise />
    </ThemeProvider>
  );
}
