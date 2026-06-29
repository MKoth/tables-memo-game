import { bubbleDeformUniformDefaults } from '../../../shaders/bubbleDeform.sksl';
import { KOI_SETTINGS } from './KoiFishLayer';

const defaults = bubbleDeformUniformDefaults;

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

/** Screen-space fish body length used to offset spawn above the clicked fish. */
export const KOI_FISH_LENGTH = 120 * KOI_SETTINGS.scale;

export const BUBBLE_IDLE_OPACITY = defaults.opacity;
