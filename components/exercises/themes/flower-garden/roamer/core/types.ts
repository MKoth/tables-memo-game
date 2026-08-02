import type { SharedValue } from 'react-native-reanimated';
import type { RoamerConfig } from './roamerConfig';

export enum FlightState {
  FLYING_IDLE = 0,
  FLYING_CRUISE = 1,
  FLYING_TURN = 2,
  APPROACH_FLOWER = 3,
  WAIT_AT_TAKEN_FLOWER = 4,
  SITTING = 5,
  LIFTING_OFF = 6,
  ESCAPING = 7,
  ESCAPED = 8,
}

export type RoamerSpecies = 'butterfly' | 'bee' | 'bumblebee';

export type RoamerSpawn = {
  xRatio: number;
  yRatio: number;
  phase: number;
  initialAngle: number;
  legPhaseOffsets: number[];
  wingPairIndex: number;
  species: RoamerSpecies;
};

export type RoamerState = {
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
  /** Index of the exit-flight leg currently being flown (0 = rose, 1 = off-screen). */
  exitLegIndex: number;
};

export type RoamerSharedRuntime = {
  spawn: RoamerSpawn;
  config: RoamerConfig;
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
  isPreTakeoff: SharedValue<number>;
  legPhases: SharedValue<number>[];
  legVisibility: SharedValue<number>;
  /** Exit-flight waypoints in screen coords: [0] = matched rose, [1] = off-screen. */
  exitLegsX: SharedValue<number[]>;
  exitLegsY: SharedValue<number[]>;
  exitLegIndex: SharedValue<number>;
};

export type RoamerRuntimeEntry = {
  spawn: RoamerSpawn;
  runtime: RoamerSharedRuntime;
};

export type RoamerPosition = {
  x: number;
  y: number;
  angle: number;
  flightState: FlightState;
};

export type SwimZone = {
  x: number;
  y: number;
  w: number;
  h: number;
};
