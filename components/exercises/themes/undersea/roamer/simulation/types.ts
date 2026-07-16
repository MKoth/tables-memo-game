import type { SharedValue } from 'react-native-reanimated';
import type { RoamerImageKey, RoamerSharedSettings } from '../config/roamerFishSettings';

export type RoamerSpawn = {
  word: string;
  imageKey: RoamerImageKey;
  spotColor: readonly [number, number, number];
  bodyColor: readonly [number, number, number];
  bodyTintStrength: number;
  overlayMaskKey: RoamerImageKey;
  overlayColor: readonly [number, number, number];
  overlayStrength: number;
  xRatio: number;
  yRatio: number;
  phase: number;
  initialAngle: number;
};

export type FishConfig = RoamerSharedSettings & RoamerSpawn;

export type FishRuntime = {
  config: FishConfig;
  x: SharedValue<number>;
  y: SharedValue<number>;
  angle: SharedValue<number>;
  speed: SharedValue<number>;
  amplitude: SharedValue<number>;
  turnArc: SharedValue<number>;
  prevAngle: SharedValue<number>;
  wanderAngle: SharedValue<number>;
  state: SharedValue<number>;
  stateTimer: SharedValue<number>;
  targetBaseSpeed: SharedValue<number>;
  wavePhase: SharedValue<number>;
  wasNearEdge: SharedValue<boolean>;
  finSquashLeft: SharedValue<number>;
  finSquashRight: SharedValue<number>;
  finPhaseLeft: SharedValue<number>;
  finPhaseRight: SharedValue<number>;
  finVariantLeft: SharedValue<number>;
  finVariantRight: SharedValue<number>;
  finFreqLeft: SharedValue<number>;
  finFreqRight: SharedValue<number>;
  finRerollTimerLeft: SharedValue<number>;
  finRerollTimerRight: SharedValue<number>;
};

export type RoamerRuntimeEntry = {
  spawn: RoamerSpawn;
  runtime: FishRuntime;
};

export type SwimZone = {
  x: number;
  y: number;
  w: number;
  h: number;
};
