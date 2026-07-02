import { create } from 'zustand';
import type { TutorialStep } from '../types/bridgeTypes';

type UnderseaThemeExerciseState = {
  tutorialStep: TutorialStep;
  helpVisible: boolean;
  soundEnabled: boolean;
  startTutorial: () => void;
  nextTutorialStep: () => void;
  dismissTutorial: () => void;
  setHelpVisible: (visible: boolean) => void;
  toggleSound: () => void;
};

export const useUnderseaThemeExerciseStore = create<UnderseaThemeExerciseState>((set) => ({
  tutorialStep: 'idle',
  helpVisible: true,
  soundEnabled: true,
  startTutorial: () => set({ tutorialStep: 'fish' }),
  nextTutorialStep: () =>
    set((state) => {
      if (state.tutorialStep === 'fish') {
        return { tutorialStep: 'jellyfish' };
      }
      if (state.tutorialStep === 'jellyfish') {
        return { tutorialStep: 'translate' };
      }
      return state;
    }),
  dismissTutorial: () => set({ tutorialStep: 'idle', helpVisible: false }),
  setHelpVisible: (visible) => set({ helpVisible: visible }),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
}));
