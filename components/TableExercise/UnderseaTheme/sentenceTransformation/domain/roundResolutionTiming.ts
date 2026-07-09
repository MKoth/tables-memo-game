import {
  BUBBLE_BURST_DURATION_MS,
  WORD_LETTER_ENTER_DURATION_MS,
  WORD_LETTER_ENTER_STAGGER_MS,
} from '../../wordTransformation/insertAnimationTiming';

/** Pause after the solved word lands so the learner can read the full sentence. */
export const ROUND_HOLD_DURATION_MS = 3000;

export const ROUND_ROW_ENTER_DURATION_MS = 1500;
export const ROUND_ROW_EXIT_DURATION_MS = 1500;

export const ROUND_ADVANCE_DELAY_MS = 400;

/** Letter bubbles unite into one word bubble before flying to the blank slot. */
export const ROUND_MERGE_DURATION_MS = 6800;

export const ROUND_MATERIALIZE_DURATION_MS = 320;

/** Merged bubble glide to the blank slot; blank jellyfish exits concurrently. */
export const ROUND_RESOLVE_FLY_DURATION_MS = 800;

/** Solved word jellyfish pop burst length. */
export const ROUND_SOLVED_POP_DURATION_MS = BUBBLE_BURST_DURATION_MS;

export function bubbleEnterDurationMs(wordLength: number): number {
  if (wordLength <= 0) {
    return 0;
  }
  return (wordLength - 1) * WORD_LETTER_ENTER_STAGGER_MS + WORD_LETTER_ENTER_DURATION_MS;
}

export function roundEnterDurationMs(wordLength: number): number {
  return ROUND_ROW_ENTER_DURATION_MS + bubbleEnterDurationMs(wordLength);
}
