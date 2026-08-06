import type { ZoneRect } from '../../../core/layout/computeExerciseLayout';
import {
  computeLetterLayout,
  previewCenterForLetter,
} from '../../../core/layout/exerciseLayout';
import type { InsertAnimationState, WordTransformationCoreSnapshot } from '../../domain/coreTypes';
import { deriveSceneState } from '../deriveSceneState';
import type { WordTransformationSceneContext } from '../sceneStateTypes';

const ROAMER: ZoneRect = { x: 0, y: 100, w: 400, h: 200 };

function makeLetters(word: string) {
  return word.split('').map((char, position) => ({
    key: `0:${position}`,
    char,
    position,
    popped: false,
    wrong: false,
  }));
}

function makeSnapshot(
  overrides: Partial<WordTransformationCoreSnapshot> = {},
): WordTransformationCoreSnapshot {
  return {
    sequence: {
      rowIndex: 0,
      colIndex: 1,
      baseWord: 'hablar',
      targetWord: 'hablamos',
      cellIndex: 0,
      operations: [],
    },
    currentWord: 'hablar',
    opIndex: 0,
    operation: null,
    mode: 'delete',
    letters: makeLetters('hablar'),
    variantPickerItems: [],
    pickerHiddenItemIds: new Set<string>(),
    wrongItemId: null,
    poppedPickerItemIds: undefined,
    insertAnimation: null,
    instruction: 'Tap a letter to delete it',
    blocked: false,
    ...overrides,
  };
}

function makeContext(overrides: Partial<WordTransformationSceneContext> = {}) {
  return {
    isCompleted: false,
    transitioning: false,
    wordTransition: null,
    ...overrides,
  };
}

function makeInsertAnimation(
  overrides: Partial<InsertAnimationState> = {},
): InsertAnimationState {
  return {
    phase: 'fly',
    selectedVariant: 'mos',
    allVariants: ['mos', 'bas', 'nes'],
    wrongVariants: ['bas', 'nes'],
    poppedWrongVariants: new Set<string>(),
    dismissPopOrder: ['b', 'n'],
    char: 'm',
    fromCenterX: 300,
    fromCenterY: 230,
    fromDiameter: 44,
    toCenterX: 180,
    toCenterY: 140,
    toDiameter: 36,
    flyDurationMs: 480,
    nextWord: 'hablamos',
    insertIndex: 6,
    insertLength: 2,
    ...overrides,
  };
}

const wordLayout = computeLetterLayout(ROAMER, 'hablar'.length);
const pickerLayout = computeLetterLayout(ROAMER, 3, 0.65);

describe('deriveSceneState', () => {
  it('maps idle letters with base-row geometry and no delays', () => {
    const state = deriveSceneState({
      snapshot: makeSnapshot(),
      context: makeContext(),
      roamerRect: ROAMER,
    });

    expect(state.wordOrbsVisible).toBe(true);
    expect(state.lettersInteractive).toBe(true);
    expect(state.insertAnimation).toBeNull();
    expect(state.variantPicker.visible).toBe(false);
    expect(state.letters).toHaveLength(6);
    state.letters.forEach((letter, i) => {
      expect(letter.position).toBe(i);
      expect(letter.char).toBe('hablar'[i]);
      expect(letter.centerX).toBe(wordLayout.centers[i]);
      expect(letter.centerY).toBe(wordLayout.rowY);
      expect(letter.diameter).toBe(wordLayout.diameter);
      expect(letter.popped).toBe(false);
      expect(letter.wrong).toBe(false);
      expect(letter.popDelayMs).toBeNull();
      expect(letter.enterDelayMs).toBeNull();
    });
  });

  it('hides the picker in delete mode and shows it in insert mode', () => {
    const deleteState = deriveSceneState({
      snapshot: makeSnapshot(),
      context: makeContext(),
      roamerRect: ROAMER,
    });
    expect(deleteState.variantPicker.visible).toBe(false);

    const insertState = deriveSceneState({
      snapshot: makeSnapshot({ mode: 'insert', variantPickerItems: [{ id: 'a', label: 'mos' }, { id: 'b', label: 'bas' }, { id: 'c', label: 'nes' }] }),
      context: makeContext(),
      roamerRect: ROAMER,
    });
    expect(insertState.variantPicker.visible).toBe(true);
    expect(insertState.variantPicker.interactive).toBe(true);
    expect(insertState.variantPicker.items).toHaveLength(3);
    insertState.variantPicker.items.forEach((item, i) => {
      expect(item.centerX).toBe(pickerLayout.centers[i]);
      expect(item.centerY).toBe(pickerLayout.rowY);
      expect(item.diameter).toBe(pickerLayout.diameter);
    });
  });

  it('shifts letters to preview layout and locks interactivity during the fly', () => {
    const insertAnimation = makeInsertAnimation();
    const state = deriveSceneState({
      snapshot: makeSnapshot({
        mode: 'insert',
        insertAnimation,
        variantPickerItems: [{ id: 'a', label: 'mos' }, { id: 'b', label: 'bas' }, { id: 'c', label: 'nes' }],
      }),
      context: makeContext(),
      roamerRect: ROAMER,
    });

    expect(state.lettersInteractive).toBe(false);
    expect(state.variantPicker.interactive).toBe(false);
    expect(state.variantPicker.visible).toBe(true);
    expect(state.insertAnimation).toBe(insertAnimation);

    const previewLayout = computeLetterLayout(ROAMER, 'hablamos'.length);
    state.letters.forEach(letter => {
      expect(letter.centerX).toBe(
        previewCenterForLetter(letter.position, {
          insertIndex: 6,
          insertLength: 2,
          targetLetterCount: 8,
        }, previewLayout),
      );
      expect(letter.centerY).toBe(previewLayout.rowY);
      expect(letter.diameter).toBe(previewLayout.diameter);
    });
  });

  it('returns letters to base layout and marks popped items during dismiss', () => {
    const state = deriveSceneState({
      snapshot: makeSnapshot({
        mode: 'insert',
        insertAnimation: makeInsertAnimation({ phase: 'dismiss' }),
        variantPickerItems: [
          { id: 'a', label: 'mos', popping: true, popDelayMs: 0 },
          { id: 'b', label: 'bas' },
          { id: 'c', label: 'nes' },
        ],
        poppedPickerItemIds: new Set(['b']),
        wrongItemId: 'c',
      }),
      context: makeContext(),
      roamerRect: ROAMER,
    });

    state.letters.forEach((letter, i) => {
      expect(letter.centerX).toBe(wordLayout.centers[i]);
      expect(letter.centerY).toBe(wordLayout.rowY);
    });

    const items = state.variantPicker.items;
    expect(items[0]?.popped).toBe(true);
    expect(items[0]?.popDelayMs).toBe(0);
    expect(items[1]?.popped).toBe(true);
    expect(items[1]?.wrong).toBe(false);
    expect(items[2]?.wrong).toBe(true);
    expect(items[2]?.popped).toBe(false);
  });

  it('hides sequential picker items via hiddenItemIds', () => {
    const state = deriveSceneState({
      snapshot: makeSnapshot({
        mode: 'insert',
        variantPickerItems: [{ id: 'a', label: 'm' }, { id: 'b', label: 's' }],
        pickerHiddenItemIds: new Set(['b']),
      }),
      context: makeContext(),
      roamerRect: ROAMER,
    });

    expect(state.variantPicker.items[0]?.hidden).toBe(false);
    expect(state.variantPicker.items[1]?.hidden).toBe(true);
  });

  it('applies the exit cascade: all popped with staggered delays', () => {
    const popOrder = [3, 0, 5, 1, 4, 2];
    const state = deriveSceneState({
      snapshot: makeSnapshot(),
      context: makeContext({
        transitioning: true,
        wordTransition: { phase: 'exit', word: 'hablar', order: popOrder },
      }),
      roamerRect: ROAMER,
    });

    expect(state.lettersInteractive).toBe(false);
    expect(state.variantPicker.visible).toBe(false);
    state.letters.forEach((letter, i) => {
      expect(letter.popped).toBe(true);
      expect(letter.char).toBe('hablar'[i]);
      const cascadeIndex = popOrder.indexOf(i);
      expect(letter.popDelayMs).toBe(cascadeIndex * 320);
      expect(letter.enterDelayMs).toBeNull();
    });
  });

  it('applies the enter cascade with staggered delays and skipEnter from snapshot', () => {
    const revealOrder = [2, 5, 0, 4, 1, 3];
    const snapshot = makeSnapshot({
      letters: makeLetters('hablar').map((letter, i) => ({
        ...letter,
        skipEnter: i === 1,
      })),
    });
    const state = deriveSceneState({
      snapshot,
      context: makeContext({
        transitioning: true,
        wordTransition: { phase: 'enter', word: 'hablar', order: revealOrder },
      }),
      roamerRect: ROAMER,
    });

    state.letters.forEach((letter, i) => {
      expect(letter.popped).toBe(false);
      const cascadeIndex = revealOrder.indexOf(i);
      expect(letter.enterDelayMs).toBe(cascadeIndex * 300);
      expect(letter.skipEnter).toBe(i === 1);
    });
  });

  it('respects isCompleted and transitioning flags', () => {
    const completed = deriveSceneState({
      snapshot: makeSnapshot(),
      context: makeContext({ isCompleted: true }),
      roamerRect: ROAMER,
    });
    expect(completed.wordOrbsVisible).toBe(false);

    const transitioning = deriveSceneState({
      snapshot: makeSnapshot(),
      context: makeContext({ transitioning: true }),
      roamerRect: ROAMER,
    });
    expect(transitioning.lettersInteractive).toBe(false);
  });

  it('handles an empty word and empty picker', () => {
    const state = deriveSceneState({
      snapshot: makeSnapshot({ currentWord: '', letters: [] }),
      context: makeContext(),
      roamerRect: ROAMER,
    });
    expect(state.letters).toEqual([]);
    expect(state.variantPicker.items).toEqual([]);
  });
});
