import type { SharedValue } from 'react-native-reanimated';

export enum FlightState {
  FLYING_IDLE = 0,
  FLYING_CRUISE = 1,
  FLYING_TURN = 2,
  APPROACH_FLOWER = 3,
  WAIT_AT_TAKEN_FLOWER = 4,
  SITTING = 5,
  LIFTING_OFF = 6,
}

export type ButterflySpawn = {
  xRatio: number;
  yRatio: number;
  phase: number;
  initialAngle: number;
  legPhaseOffsets: number[];
  wingPairIndex: number;
};

export type ButterflyState = {
  flightState: FlightState;
  positionX: number;
  positionY: number;
  angle: number;
  speed: number;
  wingPhaseLeft: number;
  wingPhaseRight: number;
  noisePhase: number;
  idleNoisePhase: number;
  legPhases: number[];
  bodyScale: number;
  legVisibility: number;
  sitPhase: number;
  phase: number;
  pathCoeff: number;
  wanderAngle: number;
  targetFlowerIndex: number;
  targetFlowerX: number;
  targetFlowerY: number;
  wanderTargetX: number;
  wanderTargetY: number;
  lastTargetFlowerIndex: number;
  waitTimer: number;
  sitTimer: number;
  stateTimer: number;
  approachOrbitTimer: number;
  sitWingPauseTimer: number;
  sitWingPauseTriggered: number;
  sitOffsetX: number;
  sitOffsetY: number;
  sitTargetOffsetX: number;
  sitTargetOffsetY: number;
  sitActionTimer: number;
};

export type ButterflySharedRuntime = {
  spawn: ButterflySpawn;
  x: SharedValue<number>;
  y: SharedValue<number>;
  angle: SharedValue<number>;
  speed: SharedValue<number>;
  wingPhase: SharedValue<number>;
  noisePhase: SharedValue<number>;
  idleNoisePhase: SharedValue<number>;
  pathCoeff: SharedValue<number>;
  state: SharedValue<number>;
  stateTimer: SharedValue<number>;
  wanderAngle: SharedValue<number>;
  prevAngle: SharedValue<number>;
  bodyScale: SharedValue<number>;
  targetFlowerIndex: SharedValue<number>;
  targetFlowerX: SharedValue<number>;
  targetFlowerY: SharedValue<number>;
  sitTimer: SharedValue<number>;
  approachOrbitTimer: SharedValue<number>;
  sitWingPauseTimer: SharedValue<number>;
  sitWingPauseTriggered: SharedValue<number>;
  sitOffsetX: SharedValue<number>;
  sitOffsetY: SharedValue<number>;
  sitTargetOffsetX: SharedValue<number>;
  sitTargetOffsetY: SharedValue<number>;
  sitActionTimer: SharedValue<number>;
};

export type ButterflyRuntime = {
  spawn: ButterflySpawn;
  state: ButterflyState;
};

export type ButterflyPosition = {
  x: number;
  y: number;
  angle: number;
  flightState: FlightState;
};

export type RoamerButterflyState = {
  runtimes: ButterflyRuntime[];
  positions: ButterflyPosition[];
};

export type ButterflyUniforms = {
  bodyW: number;
  bodyH: number;
  bodyCenterX: number;
  bodyCenterY: number;
  bodyAngle: number;
  bodyScale: number;
  wingLeftFlap: number;
  wingRightFlap: number;
  wingLeftPhase: number;
  wingRightPhase: number;
  legVisibility: number;
  legPhases: number[];
  legPhasesAdvanced: number[];
  renderMode: number;
  bodyTint?: number[];
};

export type ButterflyRuntimeEntry = {
  spawn: ButterflySpawn;
  runtime: ButterflySharedRuntime;
};

export type SwimZone = {
  x: number;
  y: number;
  w: number;
  h: number;
};
