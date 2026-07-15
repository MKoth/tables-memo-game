import {
  BUBBLE_BURST_DURATION_MS,
  INSERT_FLY_MS,
  INSERT_LAND_HANDOFF_MS,
  INSERT_RESERVE_MS,
  VARIANT_POP_STAGGER_MS,
} from '../insertAnimationTiming';
import { generateSequentialLetterChoices, type LetterChoice } from './generateOperations';
import {
  OPERATION_TYPES,
  type Operation,
  type WordOperationSequence,
} from './types';
import type {
  InsertAnimationState,
  LetterBubbleModel,
  ScheduleTimer,
  TransformationMode,
  VariantPickerPressItem,
  VariantSourceLayout,
  WordTransformationCore,
  WordTransformationCoreConfig,
  WordTransformationCoreSnapshot,
} from './coreTypes';

export type {
  InsertAnimationPhase,
  InsertAnimationState,
  LetterBubbleModel,
  ScheduleTimer,
  TransformationMode,
  VariantPickerItem,
  VariantPickerPressItem,
  VariantSourceLayout,
  WordTransformationCore,
  WordTransformationCoreConfig,
  WordTransformationCoreSnapshot,
} from './coreTypes';

export const WRONG_FEEDBACK_MS = 1000;
export const DELETE_APPLY_MS = 320;

function shuffleIndices(count: number): number[] {
  const order = Array.from({ length: count }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex]!, order[index]!];
  }
  return order;
}

function shuffleIds(ids: readonly string[]): string[] {
  return shuffleIndices(ids.length).map((index) => ids[index]!);
}

function applyDelete(word: string, index: number, length: number): string {
  return word.slice(0, index) + word.slice(index + length);
}

function applyInsert(word: string, index: number, text: string): string {
  return word.slice(0, index) + text + word.slice(index);
}

function withDismissStagger(
  items: VariantPickerPressItem[],
  wrongIds: readonly string[],
  dismissPopOrder: readonly string[],
  isDismiss: boolean,
): VariantPickerPressItem[] {
  return items.map((item) => {
    if (!isDismiss || !wrongIds.includes(item.id)) {
      return item;
    }
    const popIndex = dismissPopOrder.indexOf(item.id);
    return {
      ...item,
      popping: true,
      popDelayMs: popIndex >= 0 ? popIndex * VARIANT_POP_STAGGER_MS : undefined,
    };
  });
}

export function createWordTransformationCore(
  config: WordTransformationCoreConfig,
): WordTransformationCore {
  let sequence: WordOperationSequence | null = null;
  let sequenceKey: string | number = 0;
  let currentWord = '';
  let opIndex = 0;
  let poppedPositions = new Set<number>();
  let wrongPositions = new Set<number>();
  let wrongChoiceId: string | null = null;
  let sequentialInsertProgress = 0;
  let hiddenLetterChoiceIds = new Set<string>();
  let insertAnimation: InsertAnimationState | null = null;
  let skipEnterPositions = new Set<number>();
  let blocked = false;
  let applying = false;
  let cachedSequentialLetterChoices: LetterChoice[] | null = null;
  let cachedSequentialChoicesKey: string | null = null;

  const currentWordRef = { current: currentWord };
  const wrongTimers: Record<number, ReturnType<typeof setTimeout>> = {};
  let wrongVariantTimer: ReturnType<typeof setTimeout> | null = null;
  let opCompleteTimer: ReturnType<typeof setTimeout> | null = null;
  const insertTimerCancels: Array<() => void> = [];

  const clearInsertTimers = () => {
    insertTimerCancels.forEach((cancel) => cancel());
    insertTimerCancels.length = 0;
  };

  const notify = () => {
    config.onStateChange?.();
  };

  const scheduleInsertTimer = (fn: () => void, delayMs: number) => {
    const cancel = config.scheduleTimer(() => {
      const index = insertTimerCancels.indexOf(cancel);
      if (index >= 0) {
        insertTimerCancels.splice(index, 1);
      }
      fn();
      notify();
    }, delayMs);
    insertTimerCancels.push(cancel);
  };

  const resetWorkingState = (nextSequence: WordOperationSequence) => {
    sequence = nextSequence;
    applying = false;
    opIndex = 0;
    poppedPositions = new Set();
    wrongPositions = new Set();
    wrongChoiceId = null;
    sequentialInsertProgress = 0;
    hiddenLetterChoiceIds = new Set();
    skipEnterPositions = new Set();
    insertAnimation = null;
    blocked = false;
    cachedSequentialLetterChoices = null;
    cachedSequentialChoicesKey = null;
    clearInsertTimers();
    currentWord = nextSequence.baseWord;
    currentWordRef.current = currentWord;
  };

  const getOperation = (): Operation | null => {
    if (sequence == null || opIndex >= sequence.operations.length) {
      return null;
    }
    return sequence.operations[opIndex] ?? null;
  };

  const getMode = (): TransformationMode | null => {
    const operation = getOperation();
    if (operation == null) {
      return null;
    }
    return operation.type === OPERATION_TYPES.DELETE ? 'delete' : 'insert';
  };

  const isSequentialInsert = (): boolean => {
    const operation = getOperation();
    return operation?.type === OPERATION_TYPES.INSERT && (operation.text.length ?? 0) > 1;
  };

  const getSequentialLetterChoices = (): LetterChoice[] | null => {
    const operation = getOperation();
    if (!isSequentialInsert() || operation == null) {
      return null;
    }
    const cacheKey = `${opIndex}:${operation.text}`;
    if (cachedSequentialChoicesKey !== cacheKey) {
      cachedSequentialChoicesKey = cacheKey;
      cachedSequentialLetterChoices = generateSequentialLetterChoices(operation.text);
    }
    return cachedSequentialLetterChoices;
  };

  const flashWrongPosition = (position: number) => {
    wrongPositions = new Set(wrongPositions).add(position);
    if (wrongTimers[position] != null) {
      clearTimeout(wrongTimers[position]);
    }
    wrongTimers[position] = setTimeout(() => {
      const next = new Set(wrongPositions);
      next.delete(position);
      wrongPositions = next;
      delete wrongTimers[position];
      notify();
    }, WRONG_FEEDBACK_MS);
    notify();
  };

  const flashWrongChoice = (choiceId: string) => {
    wrongChoiceId = choiceId;
    if (wrongVariantTimer != null) {
      clearTimeout(wrongVariantTimer);
    }
    wrongVariantTimer = setTimeout(() => {
      wrongChoiceId = null;
      wrongVariantTimer = null;
      notify();
    }, WRONG_FEEDBACK_MS);
    notify();
  };

  const completeOperation = (nextWord: string) => {
    if (sequence == null) {
      return;
    }
    currentWordRef.current = nextWord;
    currentWord = nextWord;
    poppedPositions = new Set();

    const nextOpIndex = opIndex + 1;
    if (nextOpIndex >= sequence.operations.length) {
      blocked = true;
      config.onSequenceComplete(sequence, nextWord);
      notify();
      return;
    }
    opIndex = nextOpIndex;
    cachedSequentialLetterChoices = null;
    cachedSequentialChoicesKey = null;
    notify();
  };

  const finalizeInsertOperation = () => {
    if (sequence == null) {
      return;
    }
    applying = false;
    clearInsertTimers();
    insertAnimation = null;

    const nextOpIndex = opIndex + 1;
    if (nextOpIndex >= sequence.operations.length) {
      blocked = true;
      config.onSequenceComplete(sequence, currentWordRef.current);
      notify();
      return;
    }
    opIndex = nextOpIndex;
    cachedSequentialLetterChoices = null;
    cachedSequentialChoicesKey = null;
    notify();
  };

  const scheduleInsertDismissAndFinalize = (
    wrongIds: string[],
    onLand: () => void,
    sequential: boolean,
  ) => {
    scheduleInsertTimer(() => {
      onLand();
      if (insertAnimation == null) {
        return;
      }
      insertAnimation = {
        ...insertAnimation,
        phase: 'dismiss',
        dismissPopOrder: shuffleIds(wrongIds),
      };
    }, INSERT_RESERVE_MS + INSERT_FLY_MS);

    const lastPopStartMs =
      wrongIds.length > 0 ? (wrongIds.length - 1) * VARIANT_POP_STAGGER_MS : 0;
    const finalizeDelay =
      INSERT_RESERVE_MS + INSERT_FLY_MS + lastPopStartMs + BUBBLE_BURST_DURATION_MS;

    scheduleInsertTimer(() => {
      if (sequential) {
        hiddenLetterChoiceIds = new Set();
        sequentialInsertProgress = 0;
      }
      finalizeInsertOperation();
    }, finalizeDelay);
  };

  const startWholeWordInsertAnimation = (
    item: VariantPickerPressItem,
    source: VariantSourceLayout,
  ) => {
    const operation = getOperation();
    if (operation == null) {
      return;
    }

    config.playInflate?.();
    applying = true;
    clearInsertTimers();

    const nextWord = applyInsert(currentWord, operation.index, operation.text);
    const insertLength = operation.text.length;
    const allVariants = operation.variants ?? [];
    const wrongVariants = allVariants.filter((variant) => variant !== operation.text);
    const targetLayout = config.getLetterLayout(nextWord.length);
    const targetCenters = targetLayout.centers.slice(
      operation.index,
      operation.index + insertLength,
    );
    const toCenterX =
      targetCenters.length === 1
        ? (targetCenters[0] ?? 0)
        : targetCenters.reduce((sum, center) => sum + center, 0) / targetCenters.length;

    insertAnimation = {
      phase: 'fly',
      selectedVariant: operation.text,
      selectedChoiceId: item.id,
      allVariants,
      wrongVariants,
      poppedWrongVariants: new Set(),
      dismissPopOrder: [],
      char: operation.text,
      fromCenterX: source.centerX,
      fromCenterY: source.centerY,
      fromDiameter: source.diameter,
      toCenterX,
      toCenterY: targetLayout.rowY,
      toDiameter: targetLayout.diameter,
      flyDurationMs: INSERT_FLY_MS,
      nextWord,
      insertIndex: operation.index,
      insertLength,
    };
    notify();

    scheduleInsertDismissAndFinalize(
      wrongVariants,
      () => {
        skipEnterPositions = new Set(
          Array.from({ length: insertLength }, (_, index) => operation.index + index),
        );
        currentWordRef.current = nextWord;
        currentWord = nextWord;
        notify();
      },
      false,
    );
  };

  const startSequentialLetterInsertAnimation = (
    item: VariantPickerPressItem,
    source: VariantSourceLayout,
  ) => {
    const operation = getOperation();
    const sequentialLetterChoices = getSequentialLetterChoices();
    if (operation == null || sequentialLetterChoices == null) {
      return;
    }

    const expectedChar = operation.text[sequentialInsertProgress];
    if (item.label !== expectedChar) {
      config.playWrong?.();
      flashWrongChoice(item.id);
      return;
    }

    config.playInflate?.();
    applying = true;
    clearInsertTimers();

    const slotIndex = operation.index + sequentialInsertProgress;
    const partialNextWord = applyInsert(currentWord, slotIndex, expectedChar);
    const targetLayout = config.getLetterLayout(partialNextWord.length);
    const toCenterX = targetLayout.centers[slotIndex] ?? 0;
    const isLastLetter = sequentialInsertProgress + 1 >= operation.text.length;
    const nextHiddenIds = new Set(hiddenLetterChoiceIds).add(item.id);
    const remainingWrongIds = isLastLetter
      ? sequentialLetterChoices
          .filter((choice) => !nextHiddenIds.has(choice.id))
          .map((choice) => choice.id)
      : [];

    insertAnimation = {
      phase: 'fly',
      selectedVariant: item.label,
      selectedChoiceId: item.id,
      allVariants: sequentialLetterChoices.map((choice) => choice.id),
      wrongVariants: remainingWrongIds,
      poppedWrongVariants: new Set(),
      dismissPopOrder: [],
      char: item.label,
      fromCenterX: source.centerX,
      fromCenterY: source.centerY,
      fromDiameter: source.diameter,
      toCenterX,
      toCenterY: targetLayout.rowY,
      toDiameter: targetLayout.diameter,
      flyDurationMs: INSERT_FLY_MS,
      nextWord: partialNextWord,
      insertIndex: slotIndex,
      insertLength: 1,
      sequential: true,
    };
    notify();

    if (isLastLetter) {
      scheduleInsertDismissAndFinalize(
        remainingWrongIds,
        () => {
          hiddenLetterChoiceIds = nextHiddenIds;
          skipEnterPositions = new Set(skipEnterPositions).add(slotIndex);
          currentWordRef.current = partialNextWord;
          currentWord = partialNextWord;
          sequentialInsertProgress += 1;
          notify();
        },
        true,
      );
      return;
    }

    scheduleInsertTimer(() => {
      hiddenLetterChoiceIds = nextHiddenIds;
      skipEnterPositions = new Set(skipEnterPositions).add(slotIndex);
      currentWordRef.current = partialNextWord;
      currentWord = partialNextWord;
      sequentialInsertProgress += 1;
      insertAnimation =
        insertAnimation == null ? null : { ...insertAnimation, phase: 'dismiss' };
      applying = false;
      notify();
    }, INSERT_RESERVE_MS + INSERT_FLY_MS);

    scheduleInsertTimer(() => {
      insertAnimation = null;
      notify();
    }, INSERT_RESERVE_MS + INSERT_FLY_MS + INSERT_LAND_HANDOFF_MS);
  };

  const buildLetters = (): LetterBubbleModel[] =>
    currentWord.split('').map((char, position) => ({
      key: `${sequenceKey}:${position}`,
      char,
      position,
      popped: poppedPositions.has(position),
      wrong: wrongPositions.has(position),
      skipEnter: skipEnterPositions.has(position),
    }));

  const buildVariantPickerItems = (): VariantPickerPressItem[] => {
    const operation = getOperation();
    const mode = getMode();
    const sequentialLetterChoices = getSequentialLetterChoices();

    if (insertAnimation?.sequential) {
      const choices = getSequentialLetterChoices() ?? [];
      const choiceById = new Map(choices.map((choice) => [choice.id, choice]));
      const base = insertAnimation.allVariants.flatMap((id) => {
        const choice = choiceById.get(id);
        return choice == null ? [] : [{ id: choice.id, label: choice.char }];
      });
      return withDismissStagger(
        base,
        insertAnimation.wrongVariants,
        insertAnimation.dismissPopOrder,
        insertAnimation.phase === 'dismiss',
      );
    }
    if (insertAnimation != null) {
      const base = insertAnimation.allVariants.map((variant) => ({
        id: variant,
        label: variant,
      }));
      return withDismissStagger(
        base,
        insertAnimation.wrongVariants,
        insertAnimation.dismissPopOrder,
        insertAnimation.phase === 'dismiss',
      );
    }
    if (isSequentialInsert()) {
      return (sequentialLetterChoices ?? []).map((choice) => ({
        id: choice.id,
        label: choice.char,
      }));
    }
    if (mode === 'insert') {
      return (operation?.variants ?? []).map((variant) => ({ id: variant, label: variant }));
    }
    return [];
  };

  const buildInstruction = (): string => {
    const mode = getMode();
    if (mode === 'delete') {
      return 'Pop the bubbles to remove';
    }
    if (mode === 'insert') {
      return isSequentialInsert() ? 'Add the letters in order' : 'Choose the letters to add';
    }
    return '';
  };

  const getSnapshot = (): WordTransformationCoreSnapshot => {
    if (sequence == null) {
      throw new Error('Word transformation core has no active sequence');
    }

    const hidden = new Set(hiddenLetterChoiceIds);
    if (insertAnimation?.selectedChoiceId != null) {
      hidden.add(insertAnimation.selectedChoiceId);
    }

    return {
      sequence,
      currentWord,
      opIndex,
      operation: getOperation(),
      mode: getMode(),
      letters: buildLetters(),
      variantPickerItems: buildVariantPickerItems(),
      pickerHiddenItemIds: hidden,
      wrongItemId: wrongChoiceId,
      poppedPickerItemIds: insertAnimation?.poppedWrongVariants,
      insertAnimation,
      instruction: buildInstruction(),
      blocked,
    };
  };

  return {
    loadSequence(nextSequence: WordOperationSequence, nextSequenceKey: string | number) {
      sequenceKey = nextSequenceKey;
      resetWorkingState(nextSequence);
      notify();
    },

    getSnapshot,

    handleLetterPress(position: number) {
      const operation = getOperation();
      const mode = getMode();
      if (applying || blocked || operation == null || mode !== 'delete') {
        return;
      }

      const length = operation.length ?? 0;
      const start = operation.index;
      const end = start + length;
      const inRange = position >= start && position < end;

      if (!inRange || poppedPositions.has(position)) {
        config.playWrong?.();
        flashWrongPosition(position);
        return;
      }

      config.playPop?.();
      const nextPopped = new Set(poppedPositions).add(position);
      poppedPositions = nextPopped;
      notify();

      if (nextPopped.size >= length) {
        applying = true;
        const nextWord = applyDelete(currentWord, start, length);
        opCompleteTimer = setTimeout(() => {
          opCompleteTimer = null;
          applying = false;
          completeOperation(nextWord);
        }, DELETE_APPLY_MS);
      }
    },

    handleVariantPress(item: VariantPickerPressItem, source: VariantSourceLayout) {
      const operation = getOperation();
      const mode = getMode();
      if (
        applying ||
        blocked ||
        insertAnimation != null ||
        operation == null ||
        mode !== 'insert'
      ) {
        return;
      }

      if (operation.text.length > 1) {
        startSequentialLetterInsertAnimation(item, source);
        return;
      }

      if (item.label !== operation.text) {
        config.playWrong?.();
        flashWrongChoice(item.id);
        return;
      }

      startWholeWordInsertAnimation(item, source);
    },

    dispose() {
      Object.values(wrongTimers).forEach(clearTimeout);
      if (wrongVariantTimer != null) {
        clearTimeout(wrongVariantTimer);
      }
      if (opCompleteTimer != null) {
        clearTimeout(opCompleteTimer);
      }
      clearInsertTimers();
    },
  };
}
