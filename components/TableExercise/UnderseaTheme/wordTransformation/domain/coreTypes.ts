import type { Operation, WordOperationSequence } from './types';

export type LetterBubbleModel = {
  key: string;
  char: string;
  position: number;
  popped: boolean;
  wrong: boolean;
  skipEnter?: boolean;
  /** Per-letter pop delay (ms) so the exit cascade staggers on the UI thread. */
  popDelayMs?: number;
  /** Per-letter enter delay (ms) so the inflate cascade staggers on the UI thread. */
  enterDelayMs?: number;
};

export type VariantSourceLayout = {
  centerX: number;
  centerY: number;
  diameter: number;
};

export type InsertAnimationPhase = 'reserve' | 'fly' | 'dismiss';

export type InsertAnimationState = {
  phase: InsertAnimationPhase;
  selectedVariant: string;
  /** Picker item id — sequential multi-letter insert. */
  selectedChoiceId?: string;
  allVariants: string[];
  wrongVariants: string[];
  poppedWrongVariants: ReadonlySet<string>;
  /** Shuffled ids for staggered wrong-variant pops during dismiss (UI thread). */
  dismissPopOrder: readonly string[];
  char: string;
  fromCenterX: number;
  fromCenterY: number;
  fromDiameter: number;
  toCenterX: number;
  toCenterY: number;
  toDiameter: number;
  flyDurationMs: number;
  nextWord: string;
  insertIndex: number;
  insertLength: number;
  /** When true, `wrongVariants` / popped sets use picker item ids. */
  sequential?: boolean;
};

export type TransformationMode = 'delete' | 'insert';

export type LetterLayout = {
  diameter: number;
  rowY: number;
  centers: number[];
};

export type VariantPickerPressItem = {
  id: string;
  label: string;
  popDelayMs?: number;
  popping?: boolean;
};

export type WordTransformationCoreSnapshot = {
  sequence: WordOperationSequence;
  currentWord: string;
  opIndex: number;
  operation: Operation | null;
  mode: TransformationMode | null;
  letters: LetterBubbleModel[];
  variantPickerItems: VariantPickerPressItem[];
  pickerHiddenItemIds: ReadonlySet<string>;
  wrongItemId: string | null;
  poppedPickerItemIds: ReadonlySet<string> | undefined;
  insertAnimation: InsertAnimationState | null;
  instruction: string;
  blocked: boolean;
};

export type ScheduleTimer = (fn: () => void, delayMs: number) => () => void;

export type WordTransformationCoreConfig = {
  getLetterLayout: (wordLength: number) => LetterLayout;
  scheduleTimer: ScheduleTimer;
  onSequenceComplete: (sequence: WordOperationSequence, finalWord: string) => void;
  onStateChange?: () => void;
  playPop?: () => void;
  playInflate?: () => void;
  playWrong?: () => void;
};

export type WordTransformationCore = {
  loadSequence: (sequence: WordOperationSequence, sequenceKey: string | number) => void;
  getSnapshot: () => WordTransformationCoreSnapshot;
  handleLetterPress: (position: number) => void;
  handleVariantPress: (item: VariantPickerPressItem, source: VariantSourceLayout) => void;
  dispose: () => void;
};
