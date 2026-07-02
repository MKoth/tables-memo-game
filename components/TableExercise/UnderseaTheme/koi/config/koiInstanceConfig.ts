import { KOI_SETTINGS } from './koiFishLayerConfig';

/** Extra px around the analytic fish AABB so bent fins/tails are not clipped. */
export const RENDER_BOUNDS_MARGIN = 10;

/** Reference body length in px before KOI_SETTINGS.scale. */
export const KOI_BASE_LENGTH = 120;
export const KOI_BASE_THICKNESS = 38;

/** Half-length inset for swim bounds and spawn clamping. */
export const KOI_FISH_BODY_INSET = (KOI_BASE_LENGTH * KOI_SETTINGS.scale) / 2;

/** Screen-space fish body length (spawn offset, hit tests). */
export const KOI_FISH_LENGTH = KOI_BASE_LENGTH * KOI_SETTINGS.scale;
