export type RoamerConfig = {
  baseSpeedMin: number;
  baseSpeedMax: number;
  cruiseDurationMin: number;
  cruiseDurationMax: number;
  cruiseDurationJitter: number;
  idleDurationBase: number;
  idleDurationJitter: number;
  angleLerp: number;
  wanderLerp: number;
  speedLerpFactor: number;

  noiseAmplitudeMin: number;
  noiseAmplitudeMax: number;
  noiseFreqMin: number;
  noiseFreqMax: number;
  idleNoiseAmplitude: number;
  idleNoiseFrequency: number;
  idleDriftSpeed: number;

  boundaryMargin: number;
  boundaryTurnOffset: number;
  boundaryMarginRatio: number;
  separationRadius: number;
  separationSteer: number;

  wingFreqMin: number;
  wingFreqMax: number;

  approachDistanceThreshold: number;
  approachOrbitDurationMin: number;
  approachOrbitDurationMax: number;
  flightPickFlowerProbability: number;
  sitTransitionMs: number;
  sitMoveRadius: number;
  sitMoveSpeed: number;
  sitMoveVerticalSquash: number;
  sitPauseDurationMs: number;
  sitMoveTurnSpeed: number;
  sitBodyScale: number;
  sitDurationMinMs: number;
  sitDurationMaxMs: number;
  waitAtTakenFlowerPatienceMs: number;
  liftOffDurationMs: number;
  sitWingFreqMin: number;
  sitWingFreqMax: number;
  sitWingPauseDurationMinMs: number;
  sitWingPauseDurationMaxMs: number;
  sitWingPreTakeoffDurationMs: number;

  landAmplitudeBoost: number;
  takeoffAmplitudeBoost: number;
  flowerSwingBoostDecayRate: number;

  legFrequency: number;
  legBendAmount: number;
  legVisibilityFadeInMs: number;
  legVisibilityFadeOutMs: number;

  exitSpeedMultiplier: number;
  exitTurnSpeed: number;
  exitArriveRadius: number;
  /** Max angular deviation (radians) of the exit-flight meander from the direct line. */
  exitWanderDeviation: number;
  /** Scale of the cruise perpendicular noise applied to the exit flight. */
  exitNoiseScale: number;
  /** Distance from the current waypoint at which the exit flight starts decelerating. */
  exitDecelDistance: number;
  /** Fraction of the exit speed kept while touching the waypoint. */
  exitMinSpeedRatio: number;

  simFps: number;
  simStepMs: number;
};
