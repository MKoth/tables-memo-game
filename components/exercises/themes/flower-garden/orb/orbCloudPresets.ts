import type { OrbCloudLayerConfig } from './orbCloudTypes';

export const ORB_CLOUD_PATCH_COUNT = 4;

/** Peak opacity of a patch (transparency knob); each patch varies by opacityJitter. */
export const ORB_CLOUD_OPACITY = 0.5;
export const ORB_CLOUD_OPACITY_JITTER = 0.15;

/** 0 = spawns concentrated at the orb center, 1 = near the edge, 0.5 = uniform disk. */
export const ORB_CLOUD_EDGE_BIAS = 0;

/** Hold time before a patch fades out (random within the range). */
export const ORB_CLOUD_LIFETIME_MIN_MS = 2200;
export const ORB_CLOUD_LIFETIME_MAX_MS = 6600;

export const ORB_CLOUD_FADE_IN_MS = 450;
export const ORB_CLOUD_FADE_OUT_MS = 500;

/** Draw size of a patch as a fraction of the orb diameter (1 = full diameter). */
export const ORB_CLOUD_MIN_SIZE_FRACTION = 0.4;
export const ORB_CLOUD_MAX_SIZE_FRACTION = 0.95;

/** Stagger range for the first spawn of each slot on layer mount. */
export const ORB_CLOUD_INITIAL_DELAY_MAX_MS = 500;

/** Whole-layer fade-out duration when the orb starts bursting. */
export const ORB_CLOUD_DISMISS_FADE_MS = 1000;

/** Whole-layer fade-in duration on mount. */
export const ORB_CLOUD_GLOBAL_FADE_IN_MS = 1000;

/** Rotation range (rad) applied to a spawned patch. */
export const ORB_CLOUD_ROTATION_RANGE_RAD = 0.6;

/** Spawn radius is capped so the patch stays inside the orb disk. */
export const ORB_CLOUD_SPAWN_MARGIN_FRACTION = 0.6;

export function createOrbCloudLayerConfig(partial: {
  centerX: number;
  centerY: number;
  diameter: number;
  imageCount: number;
}): OrbCloudLayerConfig {
  return {
    centerX: partial.centerX,
    centerY: partial.centerY,
    diameter: partial.diameter,
    patchCount: ORB_CLOUD_PATCH_COUNT,
    peakOpacity: ORB_CLOUD_OPACITY,
    opacityJitter: ORB_CLOUD_OPACITY_JITTER,
    edgeBias: ORB_CLOUD_EDGE_BIAS,
    lifetimeMinMs: ORB_CLOUD_LIFETIME_MIN_MS,
    lifetimeMaxMs: ORB_CLOUD_LIFETIME_MAX_MS,
    fadeInMs: ORB_CLOUD_FADE_IN_MS,
    fadeOutMs: ORB_CLOUD_FADE_OUT_MS,
    minSizeFraction: ORB_CLOUD_MIN_SIZE_FRACTION,
    maxSizeFraction: ORB_CLOUD_MAX_SIZE_FRACTION,
    spawnMarginFraction: ORB_CLOUD_SPAWN_MARGIN_FRACTION,
    initialDelayMaxMs: ORB_CLOUD_INITIAL_DELAY_MAX_MS,
    dismissFadeMs: ORB_CLOUD_DISMISS_FADE_MS,
    dismissing: 0,
    imageCount: partial.imageCount,
  };
}

export const LETTER_ORB_CLOUD_PATCH_COUNT = 2;

export const LETTER_ORB_CLOUD_OPACITY = 0.55;
export const LETTER_ORB_CLOUD_OPACITY_JITTER = 0.1;

export const LETTER_ORB_CLOUD_EDGE_BIAS = 0.35;

export const LETTER_ORB_CLOUD_LIFETIME_MIN_MS = 2000;
export const LETTER_ORB_CLOUD_LIFETIME_MAX_MS = 5200;

export const LETTER_ORB_CLOUD_FADE_IN_MS = 1200;
export const LETTER_ORB_CLOUD_FADE_OUT_MS = 1200;

/** Letter orbs are 34-74px, so patches stay proportionally small. */
export const LETTER_ORB_CLOUD_MIN_SIZE_FRACTION = 0.9;
export const LETTER_ORB_CLOUD_MAX_SIZE_FRACTION = 0.95;

/** Letter orbs are small: patches hug the center more loosely. */
export const LETTER_ORB_CLOUD_SPAWN_MARGIN_FRACTION = 0.4;

export const LETTER_ORB_CLOUD_INITIAL_DELAY_MAX_MS = 250;

export function createLetterOrbCloudLayerConfig(partial: {
  centerX: number;
  centerY: number;
  diameter: number;
  imageCount: number;
}): OrbCloudLayerConfig {
  return {
    centerX: partial.centerX,
    centerY: partial.centerY,
    diameter: partial.diameter,
    patchCount: LETTER_ORB_CLOUD_PATCH_COUNT,
    peakOpacity: LETTER_ORB_CLOUD_OPACITY,
    opacityJitter: LETTER_ORB_CLOUD_OPACITY_JITTER,
    edgeBias: LETTER_ORB_CLOUD_EDGE_BIAS,
    lifetimeMinMs: LETTER_ORB_CLOUD_LIFETIME_MIN_MS,
    lifetimeMaxMs: LETTER_ORB_CLOUD_LIFETIME_MAX_MS,
    fadeInMs: LETTER_ORB_CLOUD_FADE_IN_MS,
    fadeOutMs: LETTER_ORB_CLOUD_FADE_OUT_MS,
    minSizeFraction: LETTER_ORB_CLOUD_MIN_SIZE_FRACTION,
    maxSizeFraction: LETTER_ORB_CLOUD_MAX_SIZE_FRACTION,
    spawnMarginFraction: LETTER_ORB_CLOUD_SPAWN_MARGIN_FRACTION,
    initialDelayMaxMs: LETTER_ORB_CLOUD_INITIAL_DELAY_MAX_MS,
    dismissFadeMs: ORB_CLOUD_DISMISS_FADE_MS,
    dismissing: 0,
    imageCount: partial.imageCount,
  };
}
