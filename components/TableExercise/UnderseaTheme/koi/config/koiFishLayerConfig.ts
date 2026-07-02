export const SWIM_ZONE_TOP_RATIO = 0.5;

/** Shared settings applied to every fish. */
export const KOI_SETTINGS = {
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

/** px — shadow offset from fish center (light from above-left). */
export const KOI_SHADOW_OFFSET_X = 30;
export const KOI_SHADOW_OFFSET_Y = 70;
export const KOI_SHADOW_COLOR = [0.02, 0.06, 0.12] as const;
export const KOI_SHADOW_OPACITY = 0.15;
export const KOI_SHADOW_SOFTNESS = 0.45;

export type FinSideSpawn = {
  variant: 0 | 1;
  freq: number;
  initialPhase: number;
};

export type KoiImageKey = 'koi1' | 'koi2' | 'koi3';

export const KOI_OVERLAY_PROBABILITY = 0.4;
export const KOI_BODY_TINT_PROBABILITY = 0.3;

export const KOI_SPOT_PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [0.92, 0.18, 0.12],
  [0.98, 0.42, 0.08],
  [1.00, 0.75, 0.12],
  [0.10, 0.10, 0.12],
  [0.05, 0.05, 0.05],
  [0.42, 0.25, 0.10],
  [0.73, 0.58, 0.25],
  [0.60, 0.12, 0.10],
  [0.95, 0.65, 0.25],
  [0.12, 0.12, 0.14],
  [0.45, 0.28, 0.12],
  [0.95, 0.55, 0.18],
  [0.65, 0.15, 0.12],
  [0.95, 0.55, 0.55],
  [0.88, 0.45, 0.42],
  [0.05, 0.20, 0.05],
  [0.35, 0.45, 0.20],
  [0.60, 0.72, 0.25],
];

export const KOI_BODY_PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [0.92, 0.18, 0.12],
  [0.10, 0.10, 0.12],
  [0.42, 0.25, 0.10],
  [0.60, 0.12, 0.10],
  [0.12, 0.12, 0.14],
  [0.05, 0.05, 0.05],
  [0.45, 0.28, 0.12],
  [0.65, 0.15, 0.12],
  [0.35, 0.45, 0.20],
];

export type KoiSharedSettings = typeof KOI_SETTINGS;
