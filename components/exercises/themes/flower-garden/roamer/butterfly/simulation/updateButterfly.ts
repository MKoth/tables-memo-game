import { FlightState, type ButterflySharedRuntime } from './types';
import { stepFlightStateMachine, type FlightContext } from './stepFlightStateMachine';

export function readButterflyState(
  butterfly: ButterflySharedRuntime,
): {
  flightState: FlightState;
  positionX: number;
  positionY: number;
  angle: number;
  speed: number;
  wingPhaseLeft: number;
  wingPhaseRight: number;
  noisePhase: number;
  idleNoisePhase: number;
  pathCoeff: number;
  stateTimer: number;
  wanderAngle: number;
  bodyScale: number;
  targetFlowerIndex: number;
  targetFlowerX: number;
  targetFlowerY: number;
  sitTimer: number;
  approachOrbitTimer: number;
  sitWingPauseTimer: number;
  sitWingPauseTriggered: number;
} {
  'worklet';
  return {
    flightState: butterfly.state.value as FlightState,
    positionX: butterfly.x.value,
    positionY: butterfly.y.value,
    angle: butterfly.angle.value,
    speed: butterfly.speed.value,
    wingPhaseLeft: butterfly.wingPhase.value,
    wingPhaseRight: butterfly.wingPhase.value,
    noisePhase: butterfly.noisePhase.value,
    idleNoisePhase: butterfly.idleNoisePhase.value,
    pathCoeff: butterfly.pathCoeff.value,
    stateTimer: butterfly.stateTimer.value,
    wanderAngle: butterfly.wanderAngle.value,
    bodyScale: butterfly.bodyScale.value,
    targetFlowerIndex: butterfly.targetFlowerIndex.value,
    targetFlowerX: butterfly.targetFlowerX.value,
    targetFlowerY: butterfly.targetFlowerY.value,
    sitTimer: butterfly.sitTimer.value,
    approachOrbitTimer: butterfly.approachOrbitTimer.value,
    sitWingPauseTimer: butterfly.sitWingPauseTimer.value,
    sitWingPauseTriggered: butterfly.sitWingPauseTriggered.value,
  };
}

export function writeButterflyState(
  butterfly: ButterflySharedRuntime,
  next: {
    flightState: FlightState;
    positionX: number;
    positionY: number;
    angle: number;
    speed: number;
    wingPhaseLeft: number;
    wingPhaseRight: number;
    noisePhase: number;
    idleNoisePhase: number;
    pathCoeff: number;
    stateTimer: number;
    wanderAngle: number;
    bodyScale: number;
    targetFlowerIndex: number;
    targetFlowerX: number;
    targetFlowerY: number;
    sitTimer: number;
    approachOrbitTimer: number;
    sitWingPauseTimer: number;
    sitWingPauseTriggered: number;
  },
): void {
  'worklet';
  butterfly.state.value = next.flightState;
  butterfly.x.value = next.positionX;
  butterfly.y.value = next.positionY;
  butterfly.angle.value = next.angle;
  butterfly.speed.value = next.speed;
  butterfly.wingPhase.value = next.wingPhaseLeft;
  butterfly.noisePhase.value = next.noisePhase;
  butterfly.idleNoisePhase.value = next.idleNoisePhase;
  butterfly.pathCoeff.value = next.pathCoeff;
  butterfly.stateTimer.value = next.stateTimer;
  butterfly.wanderAngle.value = next.wanderAngle;
  butterfly.bodyScale.value = next.bodyScale;
  butterfly.targetFlowerIndex.value = next.targetFlowerIndex;
  butterfly.targetFlowerX.value = next.targetFlowerX;
  butterfly.targetFlowerY.value = next.targetFlowerY;
  butterfly.sitTimer.value = next.sitTimer;
  butterfly.approachOrbitTimer.value = next.approachOrbitTimer;
  butterfly.sitWingPauseTimer.value = next.sitWingPauseTimer;
  butterfly.sitWingPauseTriggered.value = next.sitWingPauseTriggered;
}

export function updateButterfly(
  butterfly: ButterflySharedRuntime,
  dt: number,
  steerMinX: number,
  steerMaxX: number,
  steerMinY: number,
  steerMaxY: number,
  hardMinX: number,
  hardMaxX: number,
  hardMinY: number,
  hardMaxY: number,
  centerX: number,
  centerY: number,
  fieldFlowerAnchorsX: number[],
  fieldFlowerAnchorsY: number[],
  occupantSlots: number[],
  roamerIndex: number,
  elapsedMs: number,
  flowerSwingAmplitudes: number[],
  flowerSwingSpeeds: number[],
  flowerSwingPhases: number[],
  flowerSwingAngles: number[],
  boostsMutable: number[],
): void {
  'worklet';
  const state = readButterflyState(butterfly);

  const ctx: FlightContext = {
    dt,
    steerMinX,
    steerMaxX,
    steerMinY,
    steerMaxY,
    hardMinX,
    hardMaxX,
    hardMinY,
    hardMaxY,
    centerX,
    centerY,
    fieldFlowerAnchorsX,
    fieldFlowerAnchorsY,
    occupantSlots,
    roamerIndex,
    elapsedMs,
    flowerSwingAmplitudes,
    flowerSwingSpeeds,
    flowerSwingPhases,
    flowerSwingAngles,
    boostsMutable,
  };

  const initialState = {
    ...state,
    phase: butterfly.spawn.phase,
    legPhases: butterfly.spawn.legPhaseOffsets.map(() => 0),
    wingPhaseLeft: state.wingPhaseLeft,
    wingPhaseRight: state.wingPhaseRight,
    legVisibility: 0,
    sitPhase: 0,
    targetFlowerX: state.targetFlowerX,
    targetFlowerY: state.targetFlowerY,
    wanderTargetX: 0,
    wanderTargetY: 0,
    lastTargetFlowerIndex: -1,
    waitTimer: 0,
    sitTimer: state.sitTimer,
    approachOrbitTimer: state.approachOrbitTimer,
    sitWingPauseTimer: state.sitWingPauseTimer,
    sitWingPauseTriggered: state.sitWingPauseTriggered,
  };

  const next = stepFlightStateMachine(initialState, ctx);

  writeButterflyState(butterfly, {
    flightState: next.flightState,
    positionX: next.positionX,
    positionY: next.positionY,
    angle: next.angle,
    speed: next.speed,
    wingPhaseLeft: next.wingPhaseLeft,
    wingPhaseRight: next.wingPhaseRight,
    noisePhase: next.noisePhase,
    idleNoisePhase: next.idleNoisePhase,
    pathCoeff: next.pathCoeff,
    stateTimer: next.stateTimer,
    wanderAngle: next.wanderAngle,
    bodyScale: next.bodyScale,
    targetFlowerIndex: next.targetFlowerIndex,
    targetFlowerX: next.targetFlowerX,
    targetFlowerY: next.targetFlowerY,
    sitTimer: next.sitTimer,
    approachOrbitTimer: next.approachOrbitTimer,
    sitWingPauseTimer: next.sitWingPauseTimer,
    sitWingPauseTriggered: next.sitWingPauseTriggered,
  });
}
