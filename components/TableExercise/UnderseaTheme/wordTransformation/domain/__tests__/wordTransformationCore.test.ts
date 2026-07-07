import {
  BUBBLE_BURST_DURATION_MS,
  INSERT_FLY_MS,
  INSERT_LAND_HANDOFF_MS,
  INSERT_RESERVE_MS,
  VARIANT_POP_STAGGER_MS,
} from '../../insertAnimationTiming';
import {
  createWordTransformationCore,
  DELETE_APPLY_MS,
  WRONG_FEEDBACK_MS,
} from '../wordTransformationCore';
import { OPERATION_TYPES, type WordOperationSequence } from '../types';

const DELETE_SEQUENCE: WordOperationSequence = {
  rowIndex: 0,
  colIndex: 0,
  cellIndex: 4,
  baseWord: 'hablar',
  targetWord: 'habl',
  operations: [
    {
      type: OPERATION_TYPES.DELETE,
      index: 4,
      length: 2,
      text: 'ar',
    },
  ],
};

const INSERT_SEQUENCE: WordOperationSequence = {
  rowIndex: 0,
  colIndex: 0,
  cellIndex: 4,
  baseWord: 'habl',
  targetWord: 'hablo',
  operations: [
    {
      type: OPERATION_TYPES.INSERT,
      index: 4,
      text: 'o',
      variants: ['o', 'as', 'an', 'es'],
    },
  ],
};

const SEQUENTIAL_INSERT_SEQUENCE: WordOperationSequence = {
  rowIndex: 0,
  colIndex: 0,
  cellIndex: 4,
  baseWord: 'habl',
  targetWord: 'hablar',
  operations: [
    {
      type: OPERATION_TYPES.INSERT,
      index: 4,
      text: 'ar',
      variants: ['ar', 'as', 'an', 'es'],
    },
  ],
};

const TWO_STEP_SEQUENCE: WordOperationSequence = {
  rowIndex: 0,
  colIndex: 0,
  cellIndex: 4,
  baseWord: 'hablar',
  targetWord: 'hablo',
  operations: [
    {
      type: OPERATION_TYPES.DELETE,
      index: 4,
      length: 2,
      text: 'ar',
    },
    {
      type: OPERATION_TYPES.INSERT,
      index: 4,
      text: 'o',
      variants: ['o', 'as', 'an', 'es'],
    },
  ],
};

function mockLetterLayout(count: number) {
  return {
    diameter: 40,
    rowY: 100,
    centers: Array.from({ length: count }, (_, index) => index * 50),
  };
}

function createTestCore(
  sequence: WordOperationSequence,
  overrides: Partial<Parameters<typeof createWordTransformationCore>[0]> = {},
) {
  const onSequenceComplete = jest.fn();
  const timers: ReturnType<typeof setTimeout>[] = [];
  const scheduleTimer = (fn: () => void, delayMs: number) => {
    const id = setTimeout(fn, delayMs);
    timers.push(id);
    return () => clearTimeout(id);
  };

  const core = createWordTransformationCore({
    getLetterLayout: mockLetterLayout,
    scheduleTimer,
    onSequenceComplete,
    ...overrides,
  });
  core.loadSequence(sequence, 0);

  return { core, onSequenceComplete, timers };
}

describe('wordTransformationCore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('advances delete mode when every letter in the delete range is popped', () => {
    const { core, onSequenceComplete } = createTestCore(DELETE_SEQUENCE);

    expect(core.getSnapshot().mode).toBe('delete');
    expect(core.getSnapshot().currentWord).toBe('hablar');

    core.handleLetterPress(0);
    expect(core.getSnapshot().currentWord).toBe('hablar');

    core.handleLetterPress(4);
    core.handleLetterPress(5);
    jest.advanceTimersByTime(DELETE_APPLY_MS);

    expect(onSequenceComplete).toHaveBeenCalledWith(DELETE_SEQUENCE, 'habl');
  });

  it('flashes wrong delete taps without advancing the round', () => {
    const playWrong = jest.fn();
    const { core } = createTestCore(DELETE_SEQUENCE, { playWrong });

    core.handleLetterPress(0);

    expect(playWrong).toHaveBeenCalled();
    expect(core.getSnapshot().letters[0]?.wrong).toBe(true);
    expect(core.getSnapshot().currentWord).toBe('hablar');

    jest.advanceTimersByTime(WRONG_FEEDBACK_MS);
    expect(core.getSnapshot().letters[0]?.wrong).toBe(false);
  });

  it('advances insert mode when the correct variant is chosen', () => {
    const { core, onSequenceComplete } = createTestCore(INSERT_SEQUENCE);

    expect(core.getSnapshot().mode).toBe('insert');

    core.handleVariantPress(
      { id: 'o', label: 'o' },
      { centerX: 10, centerY: 20, diameter: 30 },
    );

    const finalizeDelay =
      INSERT_RESERVE_MS +
      INSERT_FLY_MS +
      3 * VARIANT_POP_STAGGER_MS +
      BUBBLE_BURST_DURATION_MS;
    jest.advanceTimersByTime(finalizeDelay);

    expect(onSequenceComplete).toHaveBeenCalledWith(INSERT_SEQUENCE, 'hablo');
  });

  it('gives wrong-variant feedback without breaking the insert round', () => {
    const playWrong = jest.fn();
    const { core, onSequenceComplete } = createTestCore(INSERT_SEQUENCE, { playWrong });

    core.handleVariantPress(
      { id: 'as', label: 'as' },
      { centerX: 10, centerY: 20, diameter: 30 },
    );

    expect(playWrong).toHaveBeenCalled();
    expect(core.getSnapshot().wrongItemId).toBe('as');
    expect(core.getSnapshot().currentWord).toBe('habl');
    expect(onSequenceComplete).not.toHaveBeenCalled();

    jest.advanceTimersByTime(WRONG_FEEDBACK_MS);
    expect(core.getSnapshot().wrongItemId).toBeNull();
  });

  it('completes a multi-operation sequence with the final transformed word', () => {
    const { core, onSequenceComplete } = createTestCore(TWO_STEP_SEQUENCE);

    core.handleLetterPress(4);
    core.handleLetterPress(5);
    jest.advanceTimersByTime(DELETE_APPLY_MS);

    expect(core.getSnapshot().mode).toBe('insert');
    expect(core.getSnapshot().currentWord).toBe('habl');

    core.handleVariantPress(
      { id: 'o', label: 'o' },
      { centerX: 10, centerY: 20, diameter: 30 },
    );

    const finalizeDelay =
      INSERT_RESERVE_MS +
      INSERT_FLY_MS +
      3 * VARIANT_POP_STAGGER_MS +
      BUBBLE_BURST_DURATION_MS;
    jest.advanceTimersByTime(finalizeDelay);

    expect(onSequenceComplete).toHaveBeenCalledWith(TWO_STEP_SEQUENCE, 'hablo');
  });

  it('keeps sequential variant picker order stable across snapshot refreshes', () => {
    const { core } = createTestCore(SEQUENTIAL_INSERT_SEQUENCE);

    const firstSnapshot = core.getSnapshot().variantPickerItems.map((item) => item.id);
    core.getSnapshot();
    core.getSnapshot();
    const secondSnapshot = core.getSnapshot().variantPickerItems.map((item) => item.id);

    expect(secondSnapshot).toEqual(firstSnapshot);
  });

  it('inserts sequential letters one at a time before completing', () => {
    const { core, onSequenceComplete } = createTestCore(SEQUENTIAL_INSERT_SEQUENCE);
    const snapshot = core.getSnapshot();
    const firstChoice = snapshot.variantPickerItems.find((item) => item.label === 'a');
    const secondChoice = snapshot.variantPickerItems.find((item) => item.label === 'r');

    expect(firstChoice).toBeDefined();
    expect(secondChoice).toBeDefined();
    expect(core.getSnapshot().instruction).toBe('Add the letters in order');

    core.handleVariantPress(firstChoice!, { centerX: 10, centerY: 20, diameter: 30 });
    jest.advanceTimersByTime(INSERT_RESERVE_MS + INSERT_FLY_MS + INSERT_LAND_HANDOFF_MS);

    expect(core.getSnapshot().currentWord).toBe('habla');
    expect(onSequenceComplete).not.toHaveBeenCalled();

    core.handleVariantPress(secondChoice!, { centerX: 10, centerY: 20, diameter: 30 });

    const remainingWrongCount = core
      .getSnapshot()
      .variantPickerItems.filter((item) => item.id !== firstChoice!.id && item.id !== secondChoice!.id)
      .length;
    const finalizeDelay =
      INSERT_RESERVE_MS +
      INSERT_FLY_MS +
      Math.max(0, remainingWrongCount - 1) * VARIANT_POP_STAGGER_MS +
      BUBBLE_BURST_DURATION_MS;
    jest.advanceTimersByTime(finalizeDelay);

    expect(onSequenceComplete).toHaveBeenCalledWith(SEQUENTIAL_INSERT_SEQUENCE, 'hablar');
  });
});
