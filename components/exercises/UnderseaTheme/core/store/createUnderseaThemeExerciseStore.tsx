import { createContext, useContext, useRef, type ReactNode } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import type { TutorialStep } from '../types/bridgeTypes';

export type UnderseaThemeExerciseStoreConfig = {
  tutorialStartStep: Exclude<TutorialStep, 'idle'>;
  getNextTutorialStep: (current: TutorialStep) => TutorialStep;
};

export const TABLE_EXERCISE_STORE_CONFIG: UnderseaThemeExerciseStoreConfig = {
  tutorialStartStep: 'fish',
  getNextTutorialStep: (current) => {
    if (current === 'fish') {
      return 'jellyfish';
    }
    if (current === 'jellyfish') {
      return 'translate';
    }
    return current;
  },
};

/** Placeholder until word-transformation tutorial steps are defined in phase 4. */
export const WORD_TRANSFORMATION_STORE_CONFIG: UnderseaThemeExerciseStoreConfig = {
  tutorialStartStep: 'fish',
  getNextTutorialStep: (current) => current,
};

export const WORD_LEARNING_STORE_CONFIG: UnderseaThemeExerciseStoreConfig = {
  tutorialStartStep: 'fish',
  getNextTutorialStep: (current) => current,
};

export type UnderseaThemeExerciseState = {
  tutorialStep: TutorialStep;
  helpVisible: boolean;
  soundEnabled: boolean;
  startTutorial: () => void;
  nextTutorialStep: () => void;
  dismissTutorial: () => void;
  setHelpVisible: (visible: boolean) => void;
  toggleSound: () => void;
};

export type UnderseaThemeExerciseStore = StoreApi<UnderseaThemeExerciseState>;

export function createUnderseaThemeExerciseStore(
  config: UnderseaThemeExerciseStoreConfig,
): UnderseaThemeExerciseStore {
  return createStore<UnderseaThemeExerciseState>((set) => ({
    tutorialStep: 'idle',
    helpVisible: true,
    soundEnabled: true,
    startTutorial: () => set({ tutorialStep: config.tutorialStartStep }),
    nextTutorialStep: () =>
      set((state) => ({
        tutorialStep: config.getNextTutorialStep(state.tutorialStep),
      })),
    dismissTutorial: () => set({ tutorialStep: 'idle', helpVisible: false }),
    setHelpVisible: (visible) => set({ helpVisible: visible }),
    toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  }));
}

const UnderseaThemeExerciseStoreContext = createContext<UnderseaThemeExerciseStore | null>(
  null,
);

export function UnderseaThemeExerciseStoreProvider({
  config,
  children,
}: {
  config: UnderseaThemeExerciseStoreConfig;
  children: ReactNode;
}) {
  const storeRef = useRef<UnderseaThemeExerciseStore | null>(null);
  if (storeRef.current == null) {
    storeRef.current = createUnderseaThemeExerciseStore(config);
  }

  return (
    <UnderseaThemeExerciseStoreContext.Provider value={storeRef.current}>
      {children}
    </UnderseaThemeExerciseStoreContext.Provider>
  );
}

export function useUnderseaThemeExerciseStore<T>(
  selector: (state: UnderseaThemeExerciseState) => T,
): T {
  const store = useContext(UnderseaThemeExerciseStoreContext);
  if (store == null) {
    throw new Error(
      'useUnderseaThemeExerciseStore must be used within UnderseaThemeExerciseStoreProvider',
    );
  }
  return useStore(store, selector);
}
