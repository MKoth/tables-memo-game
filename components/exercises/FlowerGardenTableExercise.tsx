import React from 'react';
import { FlowerGardenThemeTableExercise } from './themes/flower-garden';
import { ThemeProvider } from './themeContract';
import { flowerGardenTheme } from './themes/flower-garden';

export function FlowerGardenTableExercise() {
  return (
    <ThemeProvider theme={flowerGardenTheme}>
      <FlowerGardenThemeTableExercise />
    </ThemeProvider>
  );
}
