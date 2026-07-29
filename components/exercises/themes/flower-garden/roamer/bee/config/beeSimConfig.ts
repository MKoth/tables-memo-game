import type { RoamerConfig } from '../../core/roamerConfig';

export const BEE_WING_PAIR_COUNT = 1;
export const BEE_LEG_COUNT = 6;
export const BEE_SITTING_FLOWER_COUNT = 12;

export const BEE_WING_PAIR_PICK_BIAS = 1;
export const BEE_SIT_TRANSITION_MS = 300;
export const BEE_SIT_MOVE_RADIUS = 15;
export const BEE_SIT_MOVE_SPEED = 10;
export const BEE_SIT_MOVE_VERTICAL_SQUASH = 0.5;
export const BEE_SIT_PAUSE_DURATION_MS = 4000;
export const BEE_SIT_MOVE_TURN_SPEED = 1.0;
export const BEE_SIT_BODY_SCALE = 0.8;
export const BEE_SIT_DURATION_MIN_MS = 6000;
export const BEE_SIT_DURATION_MAX_MS = 15000;
export const BEE_WAIT_AT_TAKEN_FLOWER_PATIENCE_MS = 3000;
export const BEE_LIFT_OFF_DURATION_MS = 500;
export const BEE_FLIGHT_PICK_FLOWER_PROBABILITY = 0.6;
export const BEE_SIT_LEG_FREQUENCY = 3;
export const BEE_LEG_FREQUENCY = 10;
export const BEE_LEG_BEND_AMOUNT = 0.3;
export const BEE_LEG_VISIBILITY_FADE_IN_MS = 300;
export const BEE_LEG_VISIBILITY_FADE_OUT_MS = 300;

export const BEE_LEG_TRIPOD_OFFSETS: readonly number[] = [
  0,
  Math.PI,
  Math.PI,
  0,
  0,
  Math.PI,
];

export const BEE_APPROACH_DISTANCE_THRESHOLD = 3;
export const BEE_WING_FREQ_MIN = 20;
export const BEE_WING_FREQ_MAX = 35;
export const BEE_SIT_WING_FREQ_MIN = 1;
export const BEE_SIT_WING_FREQ_MAX = 1;
export const BEE_APPROACH_ORBIT_DURATION_MIN = 3.0;
export const BEE_APPROACH_ORBIT_DURATION_MAX = 5.0;
export const BEE_SIT_WING_PAUSE_DURATION_MIN_MS = 200;
export const BEE_SIT_WING_PAUSE_DURATION_MAX_MS = 1000;
export const BEE_SIT_WING_PRE_TAKEOFF_DURATION_MS = 1000;

export const BEE_NOISE_AMPLITUDE_MIN = 25;
export const BEE_NOISE_AMPLITUDE_MAX = 50;
export const BEE_NOISE_FREQ_MIN = 4;
export const BEE_NOISE_FREQ_MAX = 12;

export const BEE_DEFAULT_SPEED = 30;
export const BEE_BOUNDARY_MARGIN = 50;
export const BEE_SEPARATION_RADIUS = 60;
export const BEE_SEPARATION_STEER = 5;
export const BEE_BOUNDARY_TURN_OFFSET = 0.5;
export const BEE_SWIM_ZONE_TOP_RATIO = 0.5;
export const BEE_HIT_RADIUS = 35;

export const BEE_BASE_SPEED_MIN = 70;
export const BEE_BASE_SPEED_MAX = 130;
export const BEE_CRUISE_DURATION_MIN = 1.0;
export const BEE_CRUISE_DURATION_MAX = 4.0;
export const BEE_CRUISE_DURATION_JITTER = 1.0;

export const BEE_IDLE_DURATION_BASE = 2.2;
export const BEE_IDLE_DURATION_JITTER = 0.6;

export const BEE_ANGLE_LERP = 2.5;
export const BEE_WANDER_LERP = 1.0;
export const BEE_SPEED_LERP_FACTOR = 4.0;

export const BEE_BOUNDARY_MARGIN_RATIO = 0.18;

export const BEE_WANDER_DEVIATION_MIN = -Math.PI;
export const BEE_WANDER_DEVIATION_MAX = Math.PI;

export const BEE_IDLE_NOISE_AMPLITUDE = 60;
export const BEE_IDLE_NOISE_FREQUENCY = 7;

export const BEE_IDLE_DRIFT_SPEED = 5;
export const BEE_SIM_FPS = 30;
export const BEE_SIM_STEP_MS = 1000 / BEE_SIM_FPS;

export const BEE_LAND_AMPLITUDE_BOOST = 12;
export const BEE_TAKEOFF_AMPLITUDE_BOOST = 8;
export const BEE_FLOWER_SWING_BOOST_DECAY_RATE = 2.5;

export const beeRoamerConfig: RoamerConfig = {
  boundaryMargin: BEE_BOUNDARY_MARGIN,
  baseSpeedMin: BEE_BASE_SPEED_MIN,
  baseSpeedMax: BEE_BASE_SPEED_MAX,
  cruiseDurationMin: BEE_CRUISE_DURATION_MIN,
  cruiseDurationMax: BEE_CRUISE_DURATION_MAX,
  cruiseDurationJitter: BEE_CRUISE_DURATION_JITTER,
  idleDurationBase: BEE_IDLE_DURATION_BASE,
  idleDurationJitter: BEE_IDLE_DURATION_JITTER,
  angleLerp: BEE_ANGLE_LERP,
  wanderLerp: BEE_WANDER_LERP,
  speedLerpFactor: BEE_SPEED_LERP_FACTOR,

  noiseAmplitudeMin: BEE_NOISE_AMPLITUDE_MIN,
  noiseAmplitudeMax: BEE_NOISE_AMPLITUDE_MAX,
  noiseFreqMin: BEE_NOISE_FREQ_MIN,
  noiseFreqMax: BEE_NOISE_FREQ_MAX,
  idleNoiseAmplitude: BEE_IDLE_NOISE_AMPLITUDE,
  idleNoiseFrequency: BEE_IDLE_NOISE_FREQUENCY,
  idleDriftSpeed: BEE_IDLE_DRIFT_SPEED,

  boundaryTurnOffset: BEE_BOUNDARY_TURN_OFFSET,
  boundaryMarginRatio: BEE_BOUNDARY_MARGIN_RATIO,
  separationRadius: BEE_SEPARATION_RADIUS,
  separationSteer: BEE_SEPARATION_STEER,

  wingFreqMin: BEE_WING_FREQ_MIN,
  wingFreqMax: BEE_WING_FREQ_MAX,

  approachDistanceThreshold: BEE_APPROACH_DISTANCE_THRESHOLD,
  approachOrbitDurationMin: BEE_APPROACH_ORBIT_DURATION_MIN,
  approachOrbitDurationMax: BEE_APPROACH_ORBIT_DURATION_MAX,
  flightPickFlowerProbability: BEE_FLIGHT_PICK_FLOWER_PROBABILITY,
  sitTransitionMs: BEE_SIT_TRANSITION_MS,
  sitMoveRadius: BEE_SIT_MOVE_RADIUS,
  sitMoveSpeed: BEE_SIT_MOVE_SPEED,
  sitMoveVerticalSquash: BEE_SIT_MOVE_VERTICAL_SQUASH,
  sitPauseDurationMs: BEE_SIT_PAUSE_DURATION_MS,
  sitMoveTurnSpeed: BEE_SIT_MOVE_TURN_SPEED,
  sitBodyScale: BEE_SIT_BODY_SCALE,
  sitDurationMinMs: BEE_SIT_DURATION_MIN_MS,
  sitDurationMaxMs: BEE_SIT_DURATION_MAX_MS,
  waitAtTakenFlowerPatienceMs: BEE_WAIT_AT_TAKEN_FLOWER_PATIENCE_MS,
  liftOffDurationMs: BEE_LIFT_OFF_DURATION_MS,
  sitWingFreqMin: BEE_SIT_WING_FREQ_MIN,
  sitWingFreqMax: BEE_SIT_WING_FREQ_MAX,
  sitWingPauseDurationMinMs: BEE_SIT_WING_PAUSE_DURATION_MIN_MS,
  sitWingPauseDurationMaxMs: BEE_SIT_WING_PAUSE_DURATION_MAX_MS,
  sitWingPreTakeoffDurationMs: BEE_SIT_WING_PRE_TAKEOFF_DURATION_MS,

  landAmplitudeBoost: BEE_LAND_AMPLITUDE_BOOST,
  takeoffAmplitudeBoost: BEE_TAKEOFF_AMPLITUDE_BOOST,
  flowerSwingBoostDecayRate: BEE_FLOWER_SWING_BOOST_DECAY_RATE,

  legFrequency: BEE_LEG_FREQUENCY,
  legBendAmount: BEE_LEG_BEND_AMOUNT,
  legVisibilityFadeInMs: BEE_LEG_VISIBILITY_FADE_IN_MS,
  legVisibilityFadeOutMs: BEE_LEG_VISIBILITY_FADE_OUT_MS,

  simFps: BEE_SIM_FPS,
  simStepMs: BEE_SIM_STEP_MS,
};
