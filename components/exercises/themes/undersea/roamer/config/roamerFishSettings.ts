/** Shared settings applied to every fish. */
export const ROAMER_SETTINGS = {
  sourceAngle: Math.PI / 2,
  scale: 1.0,
  targetAmplitude: 0.14,
  tailBendScale: 5.5,
  tailTipBendScale: 7.5,
  headBendScale: 0.35,
  turnArcGain: 0.28,
  turnSquashGain: 0.2,
  turnBulgeGain: 0.2,
  finThinProbability: 0.5,
  finRetractFreqBase: 4.8,
  finThinFreqBase: 5.5,
  finRetractFreqJitter: 0.25,
  finThinFreqJitter: 0.25,
  finSquashBase: 0.1,
  finSquashAmp: 0.5,
  finBehaviorRerollInterval: 3.5,
  finBehaviorRerollJitter: 2.0,
} as const;

export type FinSideSpawn = {
  variant: 0 | 1;
  freq: number;
  initialPhase: number;
};

export type RoamerImageKey = 'koi1' | 'koi2' | 'koi3';

export type RoamerSharedSettings = typeof ROAMER_SETTINGS;
