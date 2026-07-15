import React, { createContext, useContext, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  computeExerciseLayout,
  type ExerciseLayout,
} from '../layout/computeExerciseLayout';
import { useExerciseDeviceOrientation } from '../layout/useExerciseDeviceOrientation';

const ExerciseLayoutContext = createContext<ExerciseLayout | null>(null);

export function ExerciseLayoutProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const orientation = useExerciseDeviceOrientation();

  const layout = useMemo(
    () => computeExerciseLayout(width, height, orientation),
    [width, height, orientation],
  );

  return (
    <ExerciseLayoutContext.Provider value={layout}>
      {children}
    </ExerciseLayoutContext.Provider>
  );
}

export function useExerciseLayout(): ExerciseLayout {
  const layout = useContext(ExerciseLayoutContext);
  if (layout == null) {
    throw new Error('useExerciseLayout must be used within ExerciseLayoutProvider');
  }
  return layout;
}
