export const BODY_FONT_SIZE = 13;
export const HEADER_FONT_SIZE = 14;

/** Drag distance → bias delta. */
export const BIAS_DRAG_SENS = 0.0035;
/** Velocity → bias fling delta. */
export const BIAS_FLING_SENS = 0.00035;
export const MAX_FLING_MS = 900;
export const MIN_FLING_MS = 80;

/** Tap-to-focus: bias travel → animation duration. */
export const FOCUS_ANIM_MIN_MS = 400;
export const FOCUS_ANIM_MAX_MS = 900;
export const FOCUS_ANIM_BIAS_SCALE = 900;
/** Hit radius multiplier beyond bell edge (includes label area). */
export const TAP_HIT_RADIUS_PAD = 1.55;
/** Pan activates after this movement (px); below it a release is a click. */
export const PAN_MIN_DISTANCE_PX = 10;
/** Tap may move up to this (px); must stay below pan activation distance. */
export const TAP_MAX_DISTANCE_PX = 10;
/** Click flash: preset tint duration before reverting to spawn colors. */
export const TINT_FLASH_MS = 800;
export const DEFAULT_TRANSLATION_DISPLAY_MS = 1000;

/**
 * Coalesce bias-driven layout recomputes to ~60fps. Pointer events on
 * ProMotion can fire up to 120Hz; without this cap the full layout would be
 * recomputed and both layers repainted on every event during a drag.
 */
export const LAYOUT_MIN_INTERVAL_MS = 1000 / 60;

/** Max shader tilt amplitude (UV units). */
export const TILT_AMP_MAX = 0.08;
/** Gesture velocity (px/s) → tilt strength. */
export const TILT_VEL_SCALE = 1 / 900;
/** Per-frame drag delta (px) → tilt strength when velocity is low. */
export const TILT_DRAG_SCALE = 0.018;
/** Bias delta per frame → tilt strength during coasting fling. */
export const TILT_BIAS_VEL_SCALE = 120;
/** Bias speed below this is treated as stopped. */
export const TILT_STOP_BIAS_VEL = 0.00003;
/** Per-frame exponential decay when layout is idle. */
export const TILT_DECAY = 0.88;
/** Applied vs live bias within this → layout considered settled. */
export const BIAS_SETTLE_EPS = 1e-4;
/** Label slide: motionAmp (UV) × bellSize × scale → screen px. */
export const LABEL_TILT_PX = 3;
/** Max label rotation during motion, in movement direction (radians). */
export const LABEL_ROTATION_MAX_RAD = (45 * Math.PI) / 180;
/** Outline thickness (px, before layout scale). */
export const LABEL_STROKE_WIDTH = 1.5;

export const WORD_SPRITE_CLOCK_FPS = 15;
