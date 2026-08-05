export const ORB_ENTER_DURATION_MS = 500;
export const ORB_BURST_DURATION_MS = 400;
export const ORB_IDLE_CLOCK_SPAN_MS = Number.MAX_SAFE_INTEGER;
/** Tween duration (ms) for relayout moves and insert flights. */
export const ORB_MOVE_DURATION_MS = 320;
/** Rate (fps) at which idle orb motion steps from the shared exercise clock. */
export const ORB_IDLE_CLOCK_FPS = 15;

export const ORB_DIAMETER_RATIO = 0.65;
export const ORB_ROAMER_SCALE = 1.22;
export const ORB_ROAMER_TAP_HIT_RADIUS = 36;
export const ORB_CAPTIVE_DRIFT_RATIO = 0.42;
export const ORB_CAPTIVE_DRIFT_SPEED_X = 0.7;
export const ORB_CAPTIVE_DRIFT_SPEED_Y = 0.55;
export const ORB_CAPTIVE_DRIFT_Y_RATIO = 0.8;
export const ORB_CAPTIVE_ANGLE_SWAY_SPEED = 0.4;
export const ORB_CAPTIVE_ANGLE_SWAY_AMP = 0.3;
export const ORB_CAPTIVE_WING_RATE = 16;

/** Wrong-feedback tint strength applied to the petal ring while an orb flashes wrong. */
export const ORB_WRONG_TINT_STRENGTH = 0.82;
/** Whole-orb shake frequency (Hz) while wrong feedback is active. */
export const ORB_WRONG_SHAKE_HZ = 11;
/** Total wrong-feedback duration (ms), matching the undersea bubble. */
export const ORB_WRONG_FEEDBACK_MS = 1000;
/** Ramp-up / ramp-down duration (ms) of the wrong tint + shake envelope. */
export const ORB_WRONG_RAMP_MS = 180;

/** Enter start diameter as a fraction of the target diameter. */
export const ORB_SPAWN_DIAMETER_RATIO = 0.18;
/** Burst ring fade-out tween window. */
export const ORB_PETAL_FADE_START = 0.5;
export const ORB_PETAL_FADE_END = 1.0;

/**
 * The simplified orb draws two pre-rendered sprites: a petal ring rotating
 * around the orb center and a clover bed sitting below it, unrotated.
 * The remaining per-orb parameters are the ring/bed diameters (as fractions
 * of the orb diameter) and the ring rotation speed.
 */
export type OrbFlowerPreset = {
  ringDiameterFraction: number;
  bedDiameterFraction: number;
  rotationSpeed: number;
};

export const ORB_FLOWER_PRESET: OrbFlowerPreset = {
  ringDiameterFraction: 0.95,
  bedDiameterFraction: 0.55,
  rotationSpeed: 0.25,
};

export const LETTER_ORB_FLOWER_PRESET: OrbFlowerPreset = {
  ringDiameterFraction: 0.9,
  bedDiameterFraction: 0.6,
  rotationSpeed: 0,
};

/** Ring scale at the start of the enter fade (shrinks down to 1). */
export const ORB_RING_ENTER_SCALE = 1.35;
/** Ring scale at the end of the burst fade (grows while fading out). */
export const ORB_RING_BURST_SCALE = 1.25;

export const ORB_FLOWER_VARIANT_COUNT = 3;
