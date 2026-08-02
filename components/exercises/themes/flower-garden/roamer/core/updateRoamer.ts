import { FlightState, type RoamerSharedRuntime, type SwimZone } from './types';
import type { RoamerConfig } from './roamerConfig';
import { stepFlightStateMachine, type FlightContext } from './stepFlightStateMachine';

export function readRoamerState(
  roamer: RoamerSharedRuntime,
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
  sitOffsetX: number;
  sitOffsetY: number;
  sitTargetOffsetX: number;
  sitTargetOffsetY: number;
  sitActionTimer: number;
  legPhases: number[];
  legVisibility: number;
  exitLegIndex: number;
} {
  'worklet';
  return {
    flightState: roamer.state.value as FlightState,
    positionX: roamer.x.value,
    positionY: roamer.y.value,
    angle: roamer.angle.value,
    speed: roamer.speed.value,
    wingPhaseLeft: roamer.wingPhase.value,
    wingPhaseRight: roamer.wingPhase.value,
    noisePhase: roamer.noisePhase.value,
    idleNoisePhase: roamer.idleNoisePhase.value,
    pathCoeff: roamer.pathCoeff.value,
    stateTimer: roamer.stateTimer.value,
    wanderAngle: roamer.wanderAngle.value,
    bodyScale: roamer.bodyScale.value,
    targetFlowerIndex: roamer.targetFlowerIndex.value,
    targetFlowerX: roamer.targetFlowerX.value,
    targetFlowerY: roamer.targetFlowerY.value,
    sitTimer: roamer.sitTimer.value,
    approachOrbitTimer: roamer.approachOrbitTimer.value,
    sitWingPauseTimer: roamer.sitWingPauseTimer.value,
    sitWingPauseTriggered: roamer.sitWingPauseTriggered.value,
    sitOffsetX: roamer.sitOffsetX.value,
    sitOffsetY: roamer.sitOffsetY.value,
    sitTargetOffsetX: roamer.sitTargetOffsetX.value,
    sitTargetOffsetY: roamer.sitTargetOffsetY.value,
    sitActionTimer: roamer.sitActionTimer.value,
    legPhases: roamer.legPhases.map(sv => sv.value),
    legVisibility: roamer.legVisibility.value,
    exitLegIndex: roamer.exitLegIndex.value,
  };
}

export function writeRoamerState(
  roamer: RoamerSharedRuntime,
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
    sitOffsetX: number;
    sitOffsetY: number;
    sitTargetOffsetX: number;
    sitTargetOffsetY: number;
    sitActionTimer: number;
    legPhases: number[];
    legVisibility: number;
    exitLegIndex: number;
  },
): void {
  'worklet';
  roamer.state.value = next.flightState;
  roamer.x.value = next.positionX;
  roamer.y.value = next.positionY;
  roamer.angle.value = next.angle;
  roamer.speed.value = next.speed;
  roamer.wingPhase.value = next.wingPhaseLeft;
  roamer.noisePhase.value = next.noisePhase;
  roamer.idleNoisePhase.value = next.idleNoisePhase;
  roamer.pathCoeff.value = next.pathCoeff;
  roamer.stateTimer.value = next.stateTimer;
  roamer.wanderAngle.value = next.wanderAngle;
  roamer.bodyScale.value = next.bodyScale;
  roamer.targetFlowerIndex.value = next.targetFlowerIndex;
  roamer.targetFlowerX.value = next.targetFlowerX;
  roamer.targetFlowerY.value = next.targetFlowerY;
  roamer.sitTimer.value = next.sitTimer;
  roamer.approachOrbitTimer.value = next.approachOrbitTimer;
  roamer.sitWingPauseTimer.value = next.sitWingPauseTimer;
  roamer.sitWingPauseTriggered.value = next.sitWingPauseTriggered;
  roamer.sitOffsetX.value = next.sitOffsetX;
  roamer.sitOffsetY.value = next.sitOffsetY;
  roamer.sitTargetOffsetX.value = next.sitTargetOffsetX;
  roamer.sitTargetOffsetY.value = next.sitTargetOffsetY;
  roamer.sitActionTimer.value = next.sitActionTimer;
  roamer.exitLegIndex.value = next.exitLegIndex;
  for (let i = 0; i < next.legPhases.length; i++) {
    roamer.legPhases[i]!.value = next.legPhases[i]!;
  }
  roamer.legVisibility.value = next.legVisibility;
}

export function updateRoamer(
  roamer: RoamerSharedRuntime,
  dt: number,
  swimZone: SwimZone,
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
  const config: RoamerConfig = roamer.config;
  const state = readRoamerState(roamer);

  const steerMinX = swimZone.x + swimZone.w * config.boundaryMarginRatio;
  const steerMaxX = swimZone.x + swimZone.w * (1 - config.boundaryMarginRatio);
  const steerMinY = swimZone.y + swimZone.h * config.boundaryMarginRatio;
  const steerMaxY = swimZone.y + swimZone.h * (1 - config.boundaryMarginRatio);
  const hardMinX = swimZone.x + config.boundaryMargin;
  const hardMaxX = swimZone.x + swimZone.w - config.boundaryMargin;
  const hardMinY = swimZone.y + config.boundaryMargin;
  const hardMaxY = swimZone.y + swimZone.h - config.boundaryMargin;
  const centerX = swimZone.x + swimZone.w * 0.5;
  const centerY = swimZone.y + swimZone.h * 0.5;

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
    exitLegsX: roamer.exitLegsX.value,
    exitLegsY: roamer.exitLegsY.value,
  };

  const initialState = {
    ...state,
    phase: roamer.spawn.phase,
    legPhases: state.legPhases,
    wingPhaseLeft: state.wingPhaseLeft,
    wingPhaseRight: state.wingPhaseRight,
    legVisibility: state.legVisibility,
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
    sitOffsetX: state.sitOffsetX,
    sitOffsetY: state.sitOffsetY,
    sitTargetOffsetX: state.sitTargetOffsetX,
    sitTargetOffsetY: state.sitTargetOffsetY,
    sitActionTimer: state.sitActionTimer,
  };

  const next = stepFlightStateMachine(initialState, ctx, config);

  roamer.isPreTakeoff.value =
    (next.flightState === FlightState.SITTING || next.flightState === FlightState.LIFTING_OFF)
    && next.stateTimer > 0
    && next.stateTimer <= config.sitWingPreTakeoffDurationMs / 1000
      ? 1
      : 0;

  writeRoamerState(roamer, {
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
    sitOffsetX: next.sitOffsetX,
    sitOffsetY: next.sitOffsetY,
    sitTargetOffsetX: next.sitTargetOffsetX,
    sitTargetOffsetY: next.sitTargetOffsetY,
    sitActionTimer: next.sitActionTimer,
    exitLegIndex: next.exitLegIndex,
    legPhases: next.legPhases,
    legVisibility: next.legVisibility,
  });
}
