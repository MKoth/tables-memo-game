import React, { createContext, useContext, useEffect, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useThrottledClock } from './useThrottledClock';

/** Master scene clock rate — consumers down-sample for slower layers. */
export const UNDERSEA_SCENE_CLOCK_FPS = 30;

type UnderseaThemeClockContextValue = {
  clock: SharedValue<number>;
  setClockActive: (active: boolean) => void;
};

const UnderseaThemeClockContext = createContext<UnderseaThemeClockContextValue | null>(null);

export function UnderseaThemeClockProvider({ children }: { children: ReactNode }) {
  const { clock, setActive: setClockActive } = useThrottledClock(UNDERSEA_SCENE_CLOCK_FPS);

  useEffect(() => {
    const syncActive = (state: AppStateStatus) => {
      setClockActive(state === 'active');
    };
    syncActive(AppState.currentState);
    const subscription = AppState.addEventListener('change', syncActive);
    return () => subscription.remove();
  }, [setClockActive]);

  return (
    <UnderseaThemeClockContext.Provider value={{ clock, setClockActive }}>
      {children}
    </UnderseaThemeClockContext.Provider>
  );
}

export function useUnderseaThemeClock(): SharedValue<number> {
  const ctx = useContext(UnderseaThemeClockContext);
  if (!ctx) {
    throw new Error('useUnderseaThemeClock must be used within UnderseaThemeClockProvider');
  }
  return ctx.clock;
}

/**
 * Down-sample the shared scene clock to a lower FPS without a second frame loop.
 */
export function useUnderseaThemeClockQuantized(fps: number): SharedValue<number> {
  const clock = useUnderseaThemeClock();
  const step = 1000 / fps;
  return useDerivedValue(() => {
    'worklet';
    return Math.floor(clock.value / step) * step;
  });
}
