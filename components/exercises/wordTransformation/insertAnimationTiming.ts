/**
 * The selected bubble now flies the instant it's picked — the surrounding word
 * letters open their gap concurrently during the (longer) fly, so no up-front
 * reserve pause is needed. Kept as a constant so downstream timing math (and a
 * possible small future pre-roll) stays in one place.
 */
export const INSERT_RESERVE_MS = 0;
/** Selected variant glide from picker row into the word slot. */
export const INSERT_FLY_MS = 480;
/** Keep flight bubble visible briefly after land so the word-row bubble can take over. */
export const INSERT_LAND_HANDOFF_MS = 48;
export const BUBBLE_BURST_DURATION_MS = 400;
/**
 * Delay between starting each pop in a cascade (wrong variants + word exit).
 * Shorter than BUBBLE_BURST_DURATION_MS so bursts overlap slightly — snappier chain.
 */
export const POP_CASCADE_STAGGER_MS = 320;
export const VARIANT_POP_STAGGER_MS = POP_CASCADE_STAGGER_MS;

/** Finished word: delay between each letter pop (exit). */
export const WORD_LETTER_EXIT_STAGGER_MS = POP_CASCADE_STAGGER_MS;
/** Next word: delay between each letter inflate (enter). */
export const WORD_LETTER_ENTER_STAGGER_MS = 300;
/** LetterBubble enter animation length — consumed by LetterBubble. */
export const WORD_LETTER_ENTER_DURATION_MS = 320;
