import type { ZoneRect } from '../../core/layout/computeExerciseLayout';
import type { InsertAnimationState } from '../domain/coreTypes';

export type WordTransformationSceneLetter = {
  position: number;
  char: string;
  centerX: number;
  centerY: number;
  diameter: number;
  popped: boolean;
  wrong: boolean;
  skipEnter?: boolean;
  /** Per-letter pop delay (ms) — burst cascade staggers on the UI thread. */
  popDelayMs: number | null;
  /** Per-letter enter delay (ms) — inflate cascade staggers on the UI thread. */
  enterDelayMs: number | null;
};

export type WordTransformationScenePickerItem = {
  id: string;
  label: string;
  centerX: number;
  centerY: number;
  diameter: number;
  popped: boolean;
  wrong: boolean;
  hidden: boolean;
  popDelayMs: number | null;
};

export type WordTransformationSceneVariantPicker = {
  visible: boolean;
  interactive: boolean;
  items: WordTransformationScenePickerItem[];
};

export type WordTransformationSceneState = {
  wordOrbsVisible: boolean;
  lettersInteractive: boolean;
  letters: WordTransformationSceneLetter[];
  /** Live insert animation (core-authored geometry) so the flight layer runs
   * without per-press React state. */
  insertAnimation: InsertAnimationState | null;
  variantPicker: WordTransformationSceneVariantPicker;
};

export type WordTransformationSceneContext = {
  isCompleted: boolean;
  transitioning: boolean;
  wordTransition: {
    phase: 'exit' | 'enter';
    word: string;
    order: readonly number[];
  } | null;
};

export type { ZoneRect };
