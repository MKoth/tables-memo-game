/** Fish behavior state machine values (stored on FishRuntime.state). */
export const ROAMER_FISH_STATE_SWIMMING = 0;
export const ROAMER_FISH_STATE_IDLE = 1;

export const ROAMER_BASE_SPEED_MIN = 50;
export const ROAMER_BASE_SPEED_MAX = 670;
export const ROAMER_SPEED_PICK_BIAS = 15.5;

export const ROAMER_SWIM_SPEED_SHADER_MIN = 2.5;
export const ROAMER_SWIM_SPEED_SHADER_MAX = 90.0;

export const ROAMER_SWIM_DURATION_MIN = 0.1;
export const ROAMER_SWIM_DURATION_MAX = 12.0;
export const ROAMER_SWIM_DURATION_JITTER = 1.5;

export const ROAMER_IDLE_DURATION_BASE = 2.0;
export const ROAMER_IDLE_DURATION_JITTER = 0.6;
export const ROAMER_IDLE_RETRACT_AMPLITUDE_RATIO = 0.3;

export const ROAMER_AMPLITUDE_LERP = 3.5;
export const ROAMER_ANGLE_LERP = 2.5;
export const ROAMER_TURN_ARC_LERP = 3.5;
export const ROAMER_TURN_ARC_MAX = 0.4;
export const ROAMER_WANDER_LERP = 0.6;
export const ROAMER_BOUNDARY_TURN_OFFSET = Math.PI * 0.25;
export const ROAMER_BOUNDARY_MARGIN_RATIO = 0.18;

/** Target-speed approach rate during free swim (multiplied by dt). */
export const ROAMER_SPEED_LERP_FACTOR = 4;

/** Normalized speed thresholds for triggering a splash sound on acceleration. */
export const ROAMER_SPLASH_SLOW_MAX_NORM = 0.4;
export const ROAMER_SPLASH_FAST_MIN_NORM = 0.6;
export const ROAMER_SPLASH_MIN_DELTA_NORM = 0.28;

/** Fraction of fish body inset used as exit-complete threshold. */
export const ROAMER_EXIT_COMPLETE_BODY_RATIO = 1.5;

/** Initial speed/amplitude multipliers when spawning a fish runtime. */
export const ROAMER_SPAWN_INITIAL_SPEED_RATIO = 0.5;
export const ROAMER_SPAWN_INITIAL_AMPLITUDE_RATIO = 0.5;

/** Spatial separation in the swim pool. */
export const ROAMER_SEPARATION_RADIUS = 75;
export const ROAMER_SEPARATION_STEER = 10.0;
export const ROAMER_SEPARATION_MIN_DIST_SQ = 0.25;

export const ROAMER_SIM_FPS = 30;
export const ROAMER_SIM_STEP_MS = 1000 / ROAMER_SIM_FPS;
