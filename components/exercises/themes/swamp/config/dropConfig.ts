export const SPAWN_INTERVAL_MS = 50;

export const DROP_SCREEN_MULTIPLIER = 2.0;
export const DROP_OFFSET_X = 0;
export const DROP_OFFSET_Y = 0;

export const DROP_EXISTENCE_MS = 800;
export const DROP_FADE_IN_MS = 100;
export const DROP_FADE_OUT_MS = 100;

export const DROP_SIZE_START_MIN = 22;
export const DROP_SIZE_START_MAX = 18;
export const DROP_SIZE_END_MIN = 7;
export const DROP_SIZE_END_MAX = 9;

export const DROP_PAD_X = 60;

export const DROP_WAVE_SPEED = 120;
export const DROP_WAVE_WIDTH = 12;
export const DROP_WAVE_STRENGTH = 12.0;
export const DROP_WAVE_DECAY = 0.025;
export const DROP_WAVE_DURATION_MS = 1000;

export const DROP_TOTAL_LIFECYCLE_MS = DROP_EXISTENCE_MS + DROP_WAVE_DURATION_MS;

export const MAX_DROPS = Math.ceil(DROP_TOTAL_LIFECYCLE_MS / SPAWN_INTERVAL_MS) + 2;
