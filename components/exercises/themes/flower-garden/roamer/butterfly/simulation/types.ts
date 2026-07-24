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
  wingLeftPhaseOffset: number;
  wingRightPhaseOffset: number;
  wingLeftFreq: number;
  wingRightFreq: number;
  legPhaseOffsets: number[];
  wingPairIndex: number;
};

export type ButterflyState = {
  flightState: FlightState;
  positionX: number;
  positionY: number;
  angle: number;
  wingPhaseLeft: number;
  wingPhaseRight: number;
  legPhases: number[];
  bodyScale: number;
  legVisibility: number;
  sitPhase: number;
  targetFlowerIndex: number | null;
  wanderTargetX: number | null;
  wanderTargetY: number | null;
  waitTimer: number;
  sitTimer: number;
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
