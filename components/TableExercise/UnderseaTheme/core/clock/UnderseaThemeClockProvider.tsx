import React, { createContext, useContext, useEffect, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useThrottledClock } from '../../../hooks/useThrottledClock';

/** Master scene clock rate — consumers down-sample for slower layers. */
export const UNDERSEA_SCENE_CLOCK_FPS = 30;

type UnderseaClockContextValue = {
  clock: SharedValue<number>;
  setClockActive: (active: boolean) => void;
};

const UnderseaClockContext = createContext<UnderseaClockContextValue | null>(null);

export function UnderseaClockProvider({ children }: { children: ReactNode }) {
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
    <UnderseaClockContext.Provider value={{ clock, setClockActive }}>
      {children}
    </UnderseaClockContext.Provider>
  );
}

export function useUnderseaClock(): SharedValue<number> {
  const ctx = useContext(UnderseaClockContext);
  if (!ctx) {
    throw new Error('useUnderseaClock must be used within UnderseaClockProvider');
  }
  return ctx.clock;
}

/**
 * Down-sample the shared scene clock to a lower FPS without a second frame loop.
 */
export function useUnderseaClockQuantized(fps: number): SharedValue<number> {
  const clock = useUnderseaClock();
  const step = 1000 / fps;
  return useDerivedValue(() => {
    'worklet';
    return Math.floor(clock.value / step) * step;
  });
}
