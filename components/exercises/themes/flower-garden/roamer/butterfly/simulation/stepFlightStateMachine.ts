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

export function stepFlightStateMachine(
  state: ButterflyState,
  ctx: FlightContext,
): ButterflyState {
  'worklet';

  const pc = state.pathCoeff;
  const wingFreq = ROAMER_BUTTERFLY_WING_FREQ_MIN + pc * (ROAMER_BUTTERFLY_WING_FREQ_MAX - ROAMER_BUTTERFLY_WING_FREQ_MIN);

  const nextWingL = state.wingPhaseLeft + wingFreq * ctx.dt;
  const nextWingR = state.wingPhaseLeft + wingFreq * ctx.dt;

  const initial = {
    ...state,
    wingPhaseLeft: nextWingL,
    wingPhaseRight: nextWingR,
  };

  switch (state.flightState) {
    case FlightState.FLYING_CRUISE: {
      const targetSpeed = ROAMER_BUTTERFLY_BASE_SPEED_MIN + pc * (ROAMER_BUTTERFLY_BASE_SPEED_MAX - ROAMER_BUTTERFLY_BASE_SPEED_MIN);
      const speed = lerp(initial.speed, targetSpeed, Math.min(1, ROAMER_BUTTERFLY_SPEED_LERP_FACTOR * ctx.dt));
      const angle = lerpAngle(initial.angle, initial.wanderAngle, Math.min(1, ROAMER_BUTTERFLY_WANDER_LERP * ctx.dt));

      const noiseFreq = ROAMER_BUTTERFLY_NOISE_FREQ_MIN + pc * (ROAMER_BUTTERFLY_NOISE_FREQ_MAX - ROAMER_BUTTERFLY_NOISE_FREQ_MIN);
      const nextNoisePhase = initial.noisePhase + noiseFreq * ctx.dt;
      const noiseAmp = ROAMER_BUTTERFLY_NOISE_AMPLITUDE_MIN + pc * (ROAMER_BUTTERFLY_NOISE_AMPLITUDE_MAX - ROAMER_BUTTERFLY_NOISE_AMPLITUDE_MIN);
      const noiseOffset = Math.sin(nextNoisePhase) * noiseAmp * ctx.dt;
      const noisePerpX = Math.cos(angle);
      const noisePerpY = Math.sin(angle);

      const moveAngle = angle - Math.PI / 2;
      let x = initial.positionX + Math.cos(moveAngle) * speed * ctx.dt + noisePerpX * noiseOffset;
      let y = initial.positionY + Math.sin(moveAngle) * speed * ctx.dt + noisePerpY * noiseOffset;
      let wanderAngle = initial.wanderAngle;

      const nearEdge =
        x < ctx.steerMinX || x > ctx.steerMaxX || y < ctx.steerMinY || y > ctx.steerMaxY;

      if (nearEdge) {
        const toCenter = Math.atan2(ctx.centerY - y, ctx.centerX - x);
        wanderAngle = toCenter + Math.PI / 2 + Math.sin(state.phase * 5.1) * ROAMER_BUTTERFLY_BOUNDARY_TURN_OFFSET;
      }

      const clamped = { x: clamp(x, ctx.hardMinX, ctx.hardMaxX), y: clamp(y, ctx.hardMinY, ctx.hardMaxY) };

      let nextState = initial.flightState;
      let nextTimer = initial.stateTimer - ctx.dt;

      if (nextTimer <= 0) {
        const roll = Math.abs(Math.sin(state.phase * 17.3 + nextWingL * 3.1));
        if (roll < ROAMER_BUTTERFLY_FLIGHT_PICK_FLOWER_PROBABILITY) {
          const freeFlowerIds: number[] = [];
          for (let i = 0; i < ctx.fieldFlowerAnchorsX.length; i++) {
            if (ctx.occupantSlots[i] === -1 && i !== state.lastTargetFlowerIndex) {
              freeFlowerIds.push(i);
            }
          }
          const targetId = pickFieldFlowerTarget(freeFlowerIds, state.lastTargetFlowerIndex, roll * 5);
          if (targetId != null) {
            return {
              ...initial,
              flightState: FlightState.APPROACH_FLOWER,
              positionX: clamped.x,
              positionY: clamped.y,
              angle,
              speed: ROAMER_BUTTERFLY_BASE_SPEED_MIN,
              targetFlowerIndex: targetId,
              targetFlowerX: ctx.fieldFlowerAnchorsX[targetId]!,
              targetFlowerY: ctx.fieldFlowerAnchorsY[targetId]!,
              stateTimer: 10,
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
        ...initial,
        flightState: nextState,
        positionX: clamped.x,
        positionY: clamped.y,
        angle: nextAngle,
        wanderAngle,
        speed,
        noisePhase: nextNoisePhase,
        stateTimer: nextTimer,
      };
    }

    case FlightState.FLYING_IDLE: {
      const idleNoisePhase = initial.idleNoisePhase + ROAMER_BUTTERFLY_IDLE_NOISE_FREQUENCY * ctx.dt;
      const idleAmp = ROAMER_BUTTERFLY_IDLE_NOISE_AMPLITUDE * ctx.dt;
      const idleNoiseX = Math.sin(idleNoisePhase) * idleAmp;
      const idleNoiseY = Math.sin(idleNoisePhase * 1.7 + 1.3) * idleAmp;
      const driftAngle = state.phase * 2.0 + nextWingL * 0.3;
      let x = initial.positionX + Math.cos(driftAngle) * ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED * ctx.dt + idleNoiseX;
      let y = initial.positionY + Math.sin(driftAngle) * ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED * ctx.dt + idleNoiseY;

      const clamped = { x: clamp(x, ctx.hardMinX, ctx.hardMaxX), y: clamp(y, ctx.hardMinY, ctx.hardMaxY) };

      let nextState = initial.flightState;
      let nextTimer = initial.stateTimer - ctx.dt;
      let newPathCoeff = initial.pathCoeff;
      let newWanderAngle = initial.wanderAngle;

      if (nextTimer <= 0) {
        nextState = FlightState.FLYING_CRUISE;
        newPathCoeff = 0.5 + 0.5 * Math.sin(nextWingL * 3.17 + state.phase * 5.23);
        nextTimer = cruiseDurationForPhase(state.phase);
        newWanderAngle = pickErraticWanderAngle(initial.angle, state.phase, 0);
      }

      return {
        ...initial,
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

    case FlightState.APPROACH_FLOWER: {
      const targetX = initial.targetFlowerX;
      const targetY = initial.targetFlowerY;
      const dx = targetX - initial.positionX;
      const dy = targetY - initial.positionY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ROAMER_BUTTERFLY_APPROACH_DISTANCE_THRESHOLD) {
        ctx.occupantSlots[initial.targetFlowerIndex] = ctx.roamerIndex;
        return {
          ...initial,
          flightState: FlightState.SITTING,
          positionX: targetX,
          positionY: targetY,
          bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
          stateTimer: ROAMER_BUTTERFLY_SIT_DURATION_MS / 1000,
          sitTimer: ROAMER_BUTTERFLY_SIT_DURATION_MS / 1000,
        };
      }

      const toFlower = Math.atan2(dy, dx);
      const speed = ROAMER_BUTTERFLY_BASE_SPEED_MIN;
      let x = initial.positionX + Math.cos(toFlower) * speed * ctx.dt;
      let y = initial.positionY + Math.sin(toFlower) * speed * ctx.dt;

      const clamped = { x: clamp(x, ctx.hardMinX, ctx.hardMaxX), y: clamp(y, ctx.hardMinY, ctx.hardMaxY) };

      return {
        ...initial,
        flightState: FlightState.APPROACH_FLOWER,
        positionX: clamped.x,
        positionY: clamped.y,
        angle: toFlower + Math.PI / 2,
        speed,
        stateTimer: initial.stateTimer - ctx.dt,
      };
    }

    case FlightState.SITTING: {
      const nextTimer = initial.stateTimer - ctx.dt;

      if (nextTimer <= 0) {
        ctx.occupantSlots[initial.targetFlowerIndex] = -1;
        return {
          ...initial,
          flightState: FlightState.LIFTING_OFF,
          stateTimer: ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS / 1000,
          legVisibility: 0,
        };
      }

      return {
        ...initial,
        flightState: FlightState.SITTING,
        positionX: initial.positionX,
        positionY: initial.positionY,
        stateTimer: nextTimer,
      };
    }

    case FlightState.LIFTING_OFF: {
      const totalDuration = ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS / 1000;
      const nextTimer = initial.stateTimer - ctx.dt;
      const elapsed = totalDuration - nextTimer;
      const progress = clamp(elapsed / totalDuration, 0, 1);
      const bodyScale = lerp(ROAMER_BUTTERFLY_SIT_BODY_SCALE, 1, progress);

      if (nextTimer <= 0) {
        return {
          ...initial,
          flightState: FlightState.FLYING_CRUISE,
          bodyScale: 1,
          stateTimer: cruiseDurationForPhase(state.phase),
          speed: ROAMER_BUTTERFLY_BASE_SPEED_MIN,
          targetFlowerIndex: -1,
          lastTargetFlowerIndex: initial.targetFlowerIndex,
        };
      }

      return {
        ...initial,
        flightState: FlightState.LIFTING_OFF,
        bodyScale,
        stateTimer: nextTimer,
      };
    }

    default:
      return initial;
  }
}
