import React, { createContext, useContext, useEffect, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useThrottledClock } from './useThrottledClock';

/** Master scene clock rate — consumers down-sample for slower layers. */
export const EXERCISE_SCENE_CLOCK_FPS = 30;

type ExerciseClockContextValue = {
  clock: SharedValue<number>;
  setClockActive: (active: boolean) => void;
};

const ExerciseClockContext = createContext<ExerciseClockContextValue | null>(null);

export function ExerciseClockProvider({ children }: { children: ReactNode }) {
  const { clock, setActive: setClockActive } = useThrottledClock(EXERCISE_SCENE_CLOCK_FPS);

  useEffect(() => {
    const syncActive = (state: AppStateStatus) => {
      setClockActive(state === 'active');
    };
    syncActive(AppState.currentState);
    const subscription = AppState.addEventListener('change', syncActive);
    return () => subscription.remove();
  }, [setClockActive]);

  return (
    <ExerciseClockContext.Provider value={{ clock, setClockActive }}>
      {children}
    </ExerciseClockContext.Provider>
  );
}

export function useExerciseClock(): SharedValue<number> {
  const ctx = useContext(ExerciseClockContext);
  if (!ctx) {
    throw new Error('useExerciseClock must be used within ExerciseClockProvider');
  }
  return ctx.clock;
}

/**
 * Down-sample the shared scene clock to a lower FPS without a second frame loop.
 */
export function useExerciseClockQuantized(fps: number): SharedValue<number> {
  const clock = useExerciseClock();
  const step = 1000 / fps;
  return useDerivedValue(() => {
    'worklet';
    return Math.floor(clock.value / step) * step;
  });
}
