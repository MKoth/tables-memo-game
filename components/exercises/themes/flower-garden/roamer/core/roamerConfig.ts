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

  landAmplitudeBoost: number;
  takeoffAmplitudeBoost: number;
  flowerSwingBoostDecayRate: number;

  legFrequency: number;
  legBendAmount: number;
  legVisibilityFadeInMs: number;
  legVisibilityFadeOutMs: number;

  simFps: number;
  simStepMs: number;
};
