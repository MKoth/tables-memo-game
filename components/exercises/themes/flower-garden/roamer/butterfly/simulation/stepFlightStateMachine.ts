import { FlightState, type ButterflyState } from './types';
import {
  ROAMER_BUTTERFLY_APPROACH_DISTANCE_THRESHOLD,
  ROAMER_BUTTERFLY_BASE_SPEED_MAX,
  ROAMER_BUTTERFLY_BASE_SPEED_MIN,
  ROAMER_BUTTERFLY_BOUNDARY_TURN_OFFSET,
  ROAMER_BUTTERFLY_FLIGHT_PICK_FLOWER_PROBABILITY,
  ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED,
  ROAMER_BUTTERFLY_IDLE_NOISE_AMPLITUDE,
  ROAMER_BUTTERFLY_IDLE_NOISE_FREQUENCY,
  ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS,
  ROAMER_BUTTERFLY_NOISE_AMPLITUDE_MAX,
  ROAMER_BUTTERFLY_NOISE_AMPLITUDE_MIN,
  ROAMER_BUTTERFLY_NOISE_FREQ_MAX,
  ROAMER_BUTTERFLY_NOISE_FREQ_MIN,
  ROAMER_BUTTERFLY_SIT_BODY_SCALE,
  ROAMER_BUTTERFLY_SIT_DURATION_MS,
  ROAMER_BUTTERFLY_SPEED_LERP_FACTOR,
  ROAMER_BUTTERFLY_WANDER_LERP,
  ROAMER_BUTTERFLY_WING_FREQ_MAX,
  ROAMER_BUTTERFLY_WING_FREQ_MIN,
} from '../config/butterflySimConfig';
import {
  clamp,
  cruiseDurationForPhase,
  idleDurationForPhase,
  lerp,
  lerpAngle,
  pickErraticWanderAngle,
} from './butterflySimHelpers';
import { pickFieldFlowerTarget } from './pickFieldFlowerTarget';

export type FlightContext = {
  dt: number;
  steerMinX: number;
  steerMaxX: number;
  steerMinY: number;
  steerMaxY: number;
  hardMinX: number;
  hardMaxX: number;
  hardMinY: number;
  hardMaxY: number;
  centerX: number;
  centerY: number;
  fieldFlowerAnchorsX: number[];
  fieldFlowerAnchorsY: number[];
  occupantSlots: number[];
  roamerIndex: number;
};

function advanceWingPhases(state: ButterflyState, ctx: FlightContext): ButterflyState {
  const pc = state.pathCoeff;
  const wingFreq = ROAMER_BUTTERFLY_WING_FREQ_MIN + pc * (ROAMER_BUTTERFLY_WING_FREQ_MAX - ROAMER_BUTTERFLY_WING_FREQ_MIN);
  return {
    ...state,
    wingPhaseLeft: state.wingPhaseLeft + wingFreq * ctx.dt,
    wingPhaseRight: state.wingPhaseLeft + wingFreq * ctx.dt,
  };
}

function clampPosition(x: number, y: number, ctx: FlightContext): { x: number; y: number } {
  return {
    x: clamp(x, ctx.hardMinX, ctx.hardMaxX),
    y: clamp(y, ctx.hardMinY, ctx.hardMaxY),
  };
}

export function stepFlightStateMachine(
  state: ButterflyState,
  ctx: FlightContext,
): ButterflyState {
  'worklet';
  const next = advanceWingPhases(state, ctx);

  switch (state.flightState) {
    case FlightState.FLYING_CRUISE:
      return stepFlyingCruise(next, ctx);
    case FlightState.FLYING_IDLE:
      return stepFlyingIdle(next, ctx);
    case FlightState.APPROACH_FLOWER:
      return stepApproachFlower(next, ctx);
    case FlightState.SITTING:
      return stepSitting(next, ctx);
    case FlightState.LIFTING_OFF:
      return stepLiftingOff(next, ctx);
    default:
      return next;
  }
}

function stepFlyingCruise(state: ButterflyState, ctx: FlightContext): ButterflyState {
  const pc = state.pathCoeff;
  const targetSpeed = ROAMER_BUTTERFLY_BASE_SPEED_MIN + pc * (ROAMER_BUTTERFLY_BASE_SPEED_MAX - ROAMER_BUTTERFLY_BASE_SPEED_MIN);
  const speed = lerp(state.speed, targetSpeed, Math.min(1, ROAMER_BUTTERFLY_SPEED_LERP_FACTOR * ctx.dt));
  const angle = lerpAngle(state.angle, state.wanderAngle, Math.min(1, ROAMER_BUTTERFLY_WANDER_LERP * ctx.dt));

  const noiseFreq = ROAMER_BUTTERFLY_NOISE_FREQ_MIN + pc * (ROAMER_BUTTERFLY_NOISE_FREQ_MAX - ROAMER_BUTTERFLY_NOISE_FREQ_MIN);
  const nextNoisePhase = state.noisePhase + noiseFreq * ctx.dt;
  const noiseAmp = ROAMER_BUTTERFLY_NOISE_AMPLITUDE_MIN + pc * (ROAMER_BUTTERFLY_NOISE_AMPLITUDE_MAX - ROAMER_BUTTERFLY_NOISE_AMPLITUDE_MIN);
  const noiseOffset = Math.sin(nextNoisePhase) * noiseAmp * ctx.dt;
  const noisePerpX = Math.cos(angle);
  const noisePerpY = Math.sin(angle);

  const moveAngle = angle - Math.PI / 2;
  let x = state.positionX + Math.cos(moveAngle) * speed * ctx.dt + noisePerpX * noiseOffset;
  let y = state.positionY + Math.sin(moveAngle) * speed * ctx.dt + noisePerpY * noiseOffset;
  let wanderAngle = state.wanderAngle;

  const nearEdge =
    x < ctx.steerMinX ||
    x > ctx.steerMaxX ||
    y < ctx.steerMinY ||
    y > ctx.steerMaxY;

  if (nearEdge) {
    const toCenter = Math.atan2(ctx.centerY - y, ctx.centerX - x);
    const turnTarget = toCenter + Math.PI / 2 + Math.sin(state.phase * 5.1) * ROAMER_BUTTERFLY_BOUNDARY_TURN_OFFSET;
    wanderAngle = turnTarget;
  }

  const clamped = clampPosition(x, y, ctx);

  let nextState = state.flightState;
  let nextTimer = state.stateTimer - ctx.dt;
  let nextWanderTargetX = state.wanderTargetX;
  let nextWanderTargetY = state.wanderTargetY;

  if (nextTimer <= 0) {
    const roll = Math.abs(Math.sin(state.phase * 17.3 + state.wingPhaseLeft * 3.1));
    if (roll < ROAMER_BUTTERFLY_FLIGHT_PICK_FLOWER_PROBABILITY) {
      const freeFlowerIds: number[] = [];
      for (let i = 0; i < ctx.fieldFlowerAnchorsX.length; i++) {
        if (ctx.occupantSlots[i] === -1 && i !== state.lastTargetFlowerIndex) {
          freeFlowerIds.push(i);
        }
      }
      const targetId = pickFieldFlowerTarget(freeFlowerIds, state.lastTargetFlowerIndex, roll * 5);
      if (targetId != null) {
        nextState = FlightState.APPROACH_FLOWER;
        nextTimer = 10;
        return {
          ...state,
          flightState: nextState,
          positionX: clamped.x,
          positionY: clamped.y,
          angle,
          speed: ROAMER_BUTTERFLY_BASE_SPEED_MIN,
          targetFlowerIndex: targetId,
          targetFlowerX: ctx.fieldFlowerAnchorsX[targetId]!,
          targetFlowerY: ctx.fieldFlowerAnchorsY[targetId]!,
          stateTimer: nextTimer,
          noisePhase: nextNoisePhase,
        };
      }
    }
    nextState = FlightState.FLYING_IDLE;
    nextTimer = idleDurationForPhase(state.phase);
  }

  const nextAngle = nearEdge
    ? lerpAngle(angle, wanderAngle, Math.min(1, 2.5 * ctx.dt))
    : angle;

  return {
    ...state,
    flightState: nextState,
    positionX: clamped.x,
    positionY: clamped.y,
    angle: nextAngle,
    wanderAngle,
    speed,
    noisePhase: nextNoisePhase,
    stateTimer: nextTimer,
    wanderTargetX: nextWanderTargetX,
    wanderTargetY: nextWanderTargetY,
  };
}

function stepFlyingIdle(state: ButterflyState, ctx: FlightContext): ButterflyState {
  const idleNoisePhase = state.idleNoisePhase + ROAMER_BUTTERFLY_IDLE_NOISE_FREQUENCY * ctx.dt;
  const idleAmp = ROAMER_BUTTERFLY_IDLE_NOISE_AMPLITUDE * ctx.dt;
  const idleNoiseX = Math.sin(idleNoisePhase) * idleAmp;
  const idleNoiseY = Math.sin(idleNoisePhase * 1.7 + 1.3) * idleAmp;
  const driftAngle = state.phase * 2.0 + state.wingPhaseLeft * 0.3;
  let x = state.positionX + Math.cos(driftAngle) * ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED * ctx.dt + idleNoiseX;
  let y = state.positionY + Math.sin(driftAngle) * ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED * ctx.dt + idleNoiseY;

  const clamped = clampPosition(x, y, ctx);

  let nextState = state.flightState;
  let nextTimer = state.stateTimer - ctx.dt;
  let newPathCoeff = state.pathCoeff;
  let newWanderAngle = state.wanderAngle;

  if (nextTimer <= 0) {
    nextState = FlightState.FLYING_CRUISE;
    newPathCoeff = 0.5 + 0.5 * Math.sin(state.wingPhaseLeft * 3.17 + state.phase * 5.23);
    nextTimer = cruiseDurationForPhase(state.phase);
    newWanderAngle = pickErraticWanderAngle(state.angle, state.phase, 0);
  }

  return {
    ...state,
    flightState: nextState,
    positionX: clamped.x,
    positionY: clamped.y,
    speed: ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED,
    idleNoisePhase,
    pathCoeff: newPathCoeff,
    wanderAngle: newWanderAngle,
    stateTimer: nextTimer,
  };
}

function stepApproachFlower(state: ButterflyState, ctx: FlightContext): ButterflyState {
  const targetX = state.targetFlowerX;
  const targetY = state.targetFlowerY;
  const dx = targetX - state.positionX;
  const dy = targetY - state.positionY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < ROAMER_BUTTERFLY_APPROACH_DISTANCE_THRESHOLD) {
    ctx.occupantSlots[state.targetFlowerIndex] = ctx.roamerIndex;
    return {
      ...state,
      flightState: FlightState.SITTING,
      positionX: targetX,
      positionY: targetY,
      bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      stateTimer: ROAMER_BUTTERFLY_SIT_DURATION_MS / 1000,
      sitTimer: ROAMER_BUTTERFLY_SIT_DURATION_MS / 1000,
    };
  }

  const approachAngle = Math.atan2(dy, dx) + Math.PI / 2;
  const speed = ROAMER_BUTTERFLY_BASE_SPEED_MIN;
  let x = state.positionX + Math.cos(approachAngle) * speed * ctx.dt;
  let y = state.positionY + Math.sin(approachAngle) * speed * ctx.dt;

  const clamped = clampPosition(x, y, ctx);

  return {
    ...state,
    flightState: FlightState.APPROACH_FLOWER,
    positionX: clamped.x,
    positionY: clamped.y,
    angle: approachAngle,
    speed,
    stateTimer: state.stateTimer - ctx.dt,
  };
}

function stepSitting(state: ButterflyState, ctx: FlightContext): ButterflyState {
  const nextTimer = state.stateTimer - ctx.dt;

  if (nextTimer <= 0) {
    ctx.occupantSlots[state.targetFlowerIndex] = -1;
    return {
      ...state,
      flightState: FlightState.LIFTING_OFF,
      stateTimer: ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS / 1000,
      legVisibility: 0,
    };
  }

  return {
    ...state,
    flightState: FlightState.SITTING,
    positionX: state.positionX,
    positionY: state.positionY,
    stateTimer: nextTimer,
  };
}

function stepLiftingOff(state: ButterflyState, ctx: FlightContext): ButterflyState {
  const totalDuration = ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS / 1000;
  const nextTimer = state.stateTimer - ctx.dt;
  const elapsed = totalDuration - nextTimer;
  const progress = clamp(elapsed / totalDuration, 0, 1);
  const bodyScale = lerp(ROAMER_BUTTERFLY_SIT_BODY_SCALE, 1, progress);

  if (nextTimer <= 0) {
    return {
      ...state,
      flightState: FlightState.FLYING_CRUISE,
      bodyScale: 1,
      stateTimer: cruiseDurationForPhase(state.phase),
      speed: ROAMER_BUTTERFLY_BASE_SPEED_MIN,
      targetFlowerIndex: -1,
      lastTargetFlowerIndex: state.targetFlowerIndex,
    };
  }

  return {
    ...state,
    flightState: FlightState.LIFTING_OFF,
    bodyScale,
    stateTimer: nextTimer,
  };
}
