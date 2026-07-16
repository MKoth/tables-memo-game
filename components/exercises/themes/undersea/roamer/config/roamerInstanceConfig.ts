import { ROAMER_SETTINGS } from './roamerFishSettings';

/** Extra px around the analytic fish AABB so bent fins/tails are not clipped. */
export const RENDER_BOUNDS_MARGIN = 10;

/** Reference body length in px before ROAMER_SETTINGS.scale. */
export const ROAMER_BASE_LENGTH = 120;
export const ROAMER_BASE_THICKNESS = 38;

/** Half-length inset for swim bounds and spawn clamping. */
export const ROAMER_FISH_BODY_INSET = (ROAMER_BASE_LENGTH * ROAMER_SETTINGS.scale) / 2;

/** Screen-space fish body length (spawn offset, hit tests). */
export const ROAMER_FISH_LENGTH = ROAMER_BASE_LENGTH * ROAMER_SETTINGS.scale;
