import { bubbleDeformUniformDefaults } from '../../shaders/bubbleDeform.sksl';

const defaults = bubbleDeformUniformDefaults;

/** Neutral tint — table / koi bubbles keep shader defaults. */
export const BUBBLE_NEUTRAL_TINT = {
  tintR: defaults.tintA[0],
  tintG: defaults.tintA[1],
  tintB: defaults.tintA[2],
  tintStrength: defaults.tintStrength,
} as const;

export const BUBBLE_ENTER_DURATION_MS = 500;
export const BUBBLE_BURST_DURATION_MS = 400;

export const BUBBLE_IDLE_WOBBLE = {
  wobbleAmp: defaults.wobbleAmp,
  wobbleSpeed: defaults.wobbleSpeed,
  wobbleLobes: defaults.wobbleLobes,
} as const;

export const BUBBLE_ENTER_WOBBLE = {
  wobbleAmp: defaults.wobbleAmp * 2.5,
  wobbleSpeed: defaults.wobbleSpeed * 1.5,
  wobbleLobes: 3,
} as const;

export const BUBBLE_BURST_WOBBLE = {
  wobbleAmp: defaults.wobbleAmp * 1.6,
  wobbleSpeed: defaults.wobbleSpeed * 2.5,
  wobbleLobes: 5,
} as const;

export const BUBBLE_START_DIAMETER_RATIO = 0.18;
export const BUBBLE_BURST_SCALE = 1.12;
export const BUBBLE_SPAWN_OFFSET_Y = 0.55;

export { KOI_FISH_LENGTH } from '../config/koiInstanceConfig';

export const BUBBLE_IDLE_OPACITY = defaults.opacity;

/** More opaque bubbles for the word-transformation exercise only. */
export const WORD_TRANSFORMATION_BUBBLE_OPACITY = 0.78;

export const BUBBLE_FISH_SCALE = 1.22;
export const BUBBLE_SHADOW_OFFSET_MULT = 1.6;
export const BUBBLE_FISH_CLIP_INSET = 0.08;
/** Inward margin from the visible bubble edge (fraction of bubble radius). */
export const BUBBLE_FISH_SWIM_MARGIN_RATIO = 0.00;
/** Tail/shader reach beyond scaled half-body length when testing wall contact. */
export const BUBBLE_FISH_VISUAL_REACH_MULT = 1.15;
