import { createContext, useContext, useRef, type ReactNode } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import type { TutorialStep } from '../types/bridgeTypes';

export type ExerciseStoreConfig = {
  tutorialStartStep: Exclude<TutorialStep, 'idle'>;
  getNextTutorialStep: (current: TutorialStep) => TutorialStep;
};

export const TABLE_EXERCISE_STORE_CONFIG: ExerciseStoreConfig = {
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
export const WORD_TRANSFORMATION_STORE_CONFIG: ExerciseStoreConfig = {
  tutorialStartStep: 'fish',
  getNextTutorialStep: (current) => current,
};

export const WORD_LEARNING_STORE_CONFIG: ExerciseStoreConfig = {
  tutorialStartStep: 'fish',
  getNextTutorialStep: (current) => current,
};

export type ExerciseState = {
  tutorialStep: TutorialStep;
  helpVisible: boolean;
  soundEnabled: boolean;
  startTutorial: () => void;
  nextTutorialStep: () => void;
  dismissTutorial: () => void;
  setHelpVisible: (visible: boolean) => void;
  toggleSound: () => void;
};

export type ExerciseStore = StoreApi<ExerciseState>;

export function createExerciseStore(
  config: ExerciseStoreConfig,
): ExerciseStore {
  return createStore<ExerciseState>((set) => ({
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

const ExerciseStoreContext = createContext<ExerciseStore | null>(
  null,
);

export function ExerciseStoreProvider({
  config,
  children,
}: {
  config: ExerciseStoreConfig;
  children: ReactNode;
}) {
  const storeRef = useRef<ExerciseStore | null>(null);
  if (storeRef.current == null) {
    storeRef.current = createExerciseStore(config);
  }

  return (
    <ExerciseStoreContext.Provider value={storeRef.current}>
      {children}
    </ExerciseStoreContext.Provider>
  );
}

export function useExerciseStore<T>(
  selector: (state: ExerciseState) => T,
): T {
  const store = useContext(ExerciseStoreContext);
  if (store == null) {
    throw new Error(
      'useExerciseStore must be used within ExerciseStoreProvider',
    );
  }
  return useStore(store, selector);
}
