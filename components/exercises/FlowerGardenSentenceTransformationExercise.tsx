import React from 'react';
import { FlowerGardenThemeTableSentenceTransformationExercise } from './themes/flower-garden';
import { ThemeProvider } from './themeContract';
import { flowerGardenTheme } from './themes/flower-garden';

export function FlowerGardenSentenceTransformationExercise() {
  return (
    <ThemeProvider theme={flowerGardenTheme}>
      <FlowerGardenThemeTableSentenceTransformationExercise />
    </ThemeProvider>
  );
}
