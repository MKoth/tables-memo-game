import { BUBBLE_BURST_DURATION_MS } from '../koi/bubbles/bubbleAnimPresets';

export const INSERT_RESERVE_MS = 320;
/** Selected variant glide from picker row into the word slot. */
export const INSERT_FLY_MS = 680;
/** Gap after one wrong-variant burst finishes before the next starts. */
export const VARIANT_POP_GAP_MS = 60;
export const VARIANT_POP_STAGGER_MS = BUBBLE_BURST_DURATION_MS + VARIANT_POP_GAP_MS;

/** Finished word: delay between each letter pop (exit). */
export const WORD_LETTER_EXIT_STAGGER_MS = VARIANT_POP_STAGGER_MS;
/** Next word: delay between each letter inflate (enter). */
export const WORD_LETTER_ENTER_STAGGER_MS = 300;
/** LetterBubble enter animation length — keep in sync with LetterBubble. */
export const WORD_LETTER_ENTER_DURATION_MS = 320;

export { BUBBLE_BURST_DURATION_MS };
