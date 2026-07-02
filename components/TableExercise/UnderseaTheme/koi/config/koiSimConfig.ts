/** Fish behavior state machine values (stored on FishRuntime.state). */
export const KOI_FISH_STATE_SWIMMING = 0;
export const KOI_FISH_STATE_IDLE = 1;

export const KOI_BASE_SPEED_MIN = 50;
export const KOI_BASE_SPEED_MAX = 670;
export const KOI_SPEED_PICK_BIAS = 15.5;

export const KOI_SWIM_SPEED_SHADER_MIN = 2.5;
export const KOI_SWIM_SPEED_SHADER_MAX = 90.0;

export const KOI_SWIM_DURATION_MIN = 0.1;
export const KOI_SWIM_DURATION_MAX = 12.0;
export const KOI_SWIM_DURATION_JITTER = 1.5;

export const KOI_IDLE_DURATION_BASE = 2.0;
export const KOI_IDLE_DURATION_JITTER = 0.6;
export const KOI_IDLE_RETRACT_AMPLITUDE_RATIO = 0.3;

export const KOI_AMPLITUDE_LERP = 3.5;
export const KOI_ANGLE_LERP = 2.5;
export const KOI_TURN_ARC_LERP = 3.5;
export const KOI_TURN_ARC_MAX = 0.4;
export const KOI_WANDER_LERP = 0.6;
export const KOI_BOUNDARY_TURN_OFFSET = Math.PI * 0.25;
export const KOI_BOUNDARY_MARGIN_RATIO = 0.18;

/** Target-speed approach rate during free swim (multiplied by dt). */
export const KOI_SPEED_LERP_FACTOR = 4;

/** Normalized speed thresholds for triggering a splash sound on acceleration. */
export const KOI_SPLASH_SLOW_MAX_NORM = 0.4;
export const KOI_SPLASH_FAST_MIN_NORM = 0.6;
export const KOI_SPLASH_MIN_DELTA_NORM = 0.28;

/** Fraction of fish body inset used as exit-complete threshold. */
export const KOI_EXIT_COMPLETE_BODY_RATIO = 0.35;

/** Initial speed/amplitude multipliers when spawning a fish runtime. */
export const KOI_SPAWN_INITIAL_SPEED_RATIO = 0.5;
export const KOI_SPAWN_INITIAL_AMPLITUDE_RATIO = 0.5;

/** Spatial separation in the swim pool. */
export const KOI_SEPARATION_RADIUS = 75;
export const KOI_SEPARATION_STEER = 10.0;
export const KOI_SEPARATION_MIN_DIST_SQ = 0.25;

export const KOI_SIM_FPS = 30;
export const KOI_SIM_STEP_MS = 1000 / KOI_SIM_FPS;
