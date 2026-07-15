import type { LetterBubbleModel } from './domain/coreTypes';
import {
  BUBBLE_BURST_DURATION_MS,
  WORD_LETTER_ENTER_DURATION_MS,
  WORD_LETTER_ENTER_STAGGER_MS,
  WORD_LETTER_EXIT_STAGGER_MS,
} from './insertAnimationTiming';

export type CascadePhase = 'enter' | 'exit';

export type LetterCascadeState = Pick<LetterBubbleModel, 'popped' | 'wrong' | 'skipEnter'>;

export type MapLettersWithCascadeParams = {
  word: string;
  keyPrefix: string | number;
  phase: CascadePhase;
  order: readonly number[];
  getLetterState?: (position: number) => LetterCascadeState | undefined;
};

function defaultShuffleIndices(count: number): number[] {
  const order = Array.from({ length: count }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]!] = [order[swapIndex]!, order[index]!];
  }
  return order;
}

export function buildCascadeRevealOrder(
  wordLength: number,
  shuffleIndices: (count: number) => number[] = defaultShuffleIndices,
): number[] {
  return shuffleIndices(wordLength);
}

export function mapLettersWithCascade({
  word,
  keyPrefix,
  phase,
  order,
  getLetterState,
}: MapLettersWithCascadeParams): LetterBubbleModel[] {
  const isExit = phase === 'exit';
  const staggerMs = isExit ? WORD_LETTER_EXIT_STAGGER_MS : WORD_LETTER_ENTER_STAGGER_MS;

  return word.split('').map((char, position) => {
    const cascadeIndex = order.indexOf(position);
    const cascadeDelayMs = cascadeIndex >= 0 ? cascadeIndex * staggerMs : undefined;
    const letterState = getLetterState?.(position);

    return {
      key: `${keyPrefix}:${position}`,
      char,
      position,
      popped: isExit ? true : letterState?.popped ?? false,
      wrong: letterState?.wrong ?? false,
      skipEnter: letterState?.skipEnter,
      popDelayMs: isExit ? cascadeDelayMs : undefined,
      enterDelayMs: isExit ? undefined : cascadeDelayMs,
    };
  });
}

export function computeCascadeCompleteDelayMs(
  orderLength: number,
  phase: CascadePhase,
): number {
  if (orderLength <= 0) {
    return 0;
  }

  const staggerMs =
    phase === 'enter' ? WORD_LETTER_ENTER_STAGGER_MS : WORD_LETTER_EXIT_STAGGER_MS;
  const durationMs =
    phase === 'enter' ? WORD_LETTER_ENTER_DURATION_MS : BUBBLE_BURST_DURATION_MS;

  return (orderLength - 1) * staggerMs + durationMs;
}
