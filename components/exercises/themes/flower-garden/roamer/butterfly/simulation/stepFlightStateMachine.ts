import { FlightState, type ButterflyState } from './types';
import {
  ROAMER_BUTTERFLY_APPROACH_DISTANCE_THRESHOLD,
  ROAMER_BUTTERFLY_APPROACH_ORBIT_DURATION_MAX,
  ROAMER_BUTTERFLY_APPROACH_ORBIT_DURATION_MIN,
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
  ROAMER_BUTTERFLY_SIT_DURATION_MAX_MS,
  ROAMER_BUTTERFLY_SIT_DURATION_MIN_MS,
  ROAMER_BUTTERFLY_SIT_WING_FREQ_MAX,
  ROAMER_BUTTERFLY_SIT_WING_FREQ_MIN,
  ROAMER_BUTTERFLY_SIT_WING_PAUSE_DURATION_MAX_MS,
  ROAMER_BUTTERFLY_SIT_WING_PAUSE_DURATION_MIN_MS,
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
  elapsedMs: number;
  flowerSwingAmplitudes: number[];
  flowerSwingSpeeds: number[];
  flowerSwingPhases: number[];
  flowerSwingAngles: number[];
};

function pickRandomBetween(rngPhase: number, min: number, max: number): number {
  'worklet';
  const t = Math.abs(Math.sin(rngPhase * 13.7 + 7.3));
  return min + t * (max - min);
}

function computeFlowerSwingOffset(
  elapsedMs: number,
  flowerIndex: number,
  swingAmplitudes: number[],
  swingSpeeds: number[],
  swingPhases: number[],
  swingAngles: number[],
): { x: number; y: number } {
  'worklet';
  const amp = swingAmplitudes[flowerIndex] ?? 0;
  const speed = swingSpeeds[flowerIndex] ?? 0;
  const phase = swingPhases[flowerIndex] ?? 0;
  const angle = swingAngles[flowerIndex] ?? 0;
  const swing = Math.sin((elapsedMs / 1000) * speed + phase) * amp;
  return { x: swing * Math.cos(angle), y: swing * Math.sin(angle) };
}

function advanceIdleNoise(phase: number, dt: number): { nextPhase: number; noiseX: number; noiseY: number } {
  'worklet';
  const nextPhase = phase + ROAMER_BUTTERFLY_IDLE_NOISE_FREQUENCY * dt;
  const amp = ROAMER_BUTTERFLY_IDLE_NOISE_AMPLITUDE * dt;
  return {
    nextPhase,
    noiseX: Math.sin(nextPhase) * amp,
    noiseY: Math.sin(nextPhase * 1.7 + 1.3) * amp,
  };
}

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
              const fx = ctx.fieldFlowerAnchorsX[i]!;
              const fy = ctx.fieldFlowerAnchorsY[i]!;
              if (fx >= ctx.hardMinX && fx <= ctx.hardMaxX && fy >= ctx.hardMinY && fy <= ctx.hardMaxY) {
                freeFlowerIds.push(i);
              }
            }
          }
          const targetId = pickFieldFlowerTarget(freeFlowerIds, state.lastTargetFlowerIndex, roll * 5);
          if (targetId != null) {
            const orbitDuration = pickRandomBetween(
              state.phase + state.wingPhaseLeft,
              ROAMER_BUTTERFLY_APPROACH_ORBIT_DURATION_MIN,
              ROAMER_BUTTERFLY_APPROACH_ORBIT_DURATION_MAX,
            );
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
              stateTimer: orbitDuration,
              approachOrbitTimer: orbitDuration,
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

      const isOrbiting = initial.approachOrbitTimer > 0;

      if (isOrbiting) {
        const orbitAngle = Math.atan2(dy, dx) + Math.PI / 2;
        const speed = ROAMER_BUTTERFLY_BASE_SPEED_MIN;
        const { nextPhase: nextIdleNoise, noiseX, noiseY } = advanceIdleNoise(initial.idleNoisePhase, ctx.dt);
        let x = initial.positionX + Math.cos(orbitAngle) * speed * ctx.dt + noiseX;
        let y = initial.positionY + Math.sin(orbitAngle) * speed * ctx.dt + noiseY;

        const clamped = { x: clamp(x, ctx.hardMinX, ctx.hardMaxX), y: clamp(y, ctx.hardMinY, ctx.hardMaxY) };

        const nextOrbitTimer = initial.approachOrbitTimer - ctx.dt;

        if (nextOrbitTimer <= 0) {
          const flowerIndex = initial.targetFlowerIndex;
          const isFree = ctx.occupantSlots[flowerIndex] === -1;

          if (isFree) {
            ctx.occupantSlots[flowerIndex] = ctx.roamerIndex;
            return {
              ...initial,
              flightState: FlightState.APPROACH_FLOWER,
              positionX: clamped.x,
              positionY: clamped.y,
              angle: orbitAngle,
              speed,
              approachOrbitTimer: 0,
              stateTimer: initial.stateTimer - ctx.dt,
              idleNoisePhase: nextIdleNoise,
            };
          }

          const freeFlowerIds: number[] = [];
          for (let i = 0; i < ctx.fieldFlowerAnchorsX.length; i++) {
            if (ctx.occupantSlots[i] === -1) {
              const fx = ctx.fieldFlowerAnchorsX[i]!;
              const fy = ctx.fieldFlowerAnchorsY[i]!;
              if (fx >= ctx.hardMinX && fx <= ctx.hardMaxX && fy >= ctx.hardMinY && fy <= ctx.hardMaxY) {
                freeFlowerIds.push(i);
              }
            }
          }
          const newTargetId = pickFieldFlowerTarget(freeFlowerIds, flowerIndex, Math.abs(Math.sin(state.phase * 7.1 + ctx.dt)));
          if (newTargetId != null) {
            const newOrbitDuration = pickRandomBetween(
              state.phase + state.wingPhaseLeft + 1.3,
              ROAMER_BUTTERFLY_APPROACH_ORBIT_DURATION_MIN,
              ROAMER_BUTTERFLY_APPROACH_ORBIT_DURATION_MAX,
            );
            return {
              ...initial,
              flightState: FlightState.APPROACH_FLOWER,
              positionX: clamped.x,
              positionY: clamped.y,
              angle: orbitAngle,
              speed,
              targetFlowerIndex: newTargetId,
              targetFlowerX: ctx.fieldFlowerAnchorsX[newTargetId]!,
              targetFlowerY: ctx.fieldFlowerAnchorsY[newTargetId]!,
              approachOrbitTimer: newOrbitDuration,
              stateTimer: initial.stateTimer - ctx.dt,
              idleNoisePhase: nextIdleNoise,
            };
          }

          return {
            ...initial,
            flightState: FlightState.FLYING_CRUISE,
            positionX: clamped.x,
            positionY: clamped.y,
            angle: orbitAngle,
            speed: ROAMER_BUTTERFLY_BASE_SPEED_MIN,
            targetFlowerIndex: -1,
            approachOrbitTimer: 0,
            stateTimer: cruiseDurationForPhase(state.phase),
            idleNoisePhase: nextIdleNoise,
          };
        }

        return {
          ...initial,
          flightState: FlightState.APPROACH_FLOWER,
          positionX: clamped.x,
          positionY: clamped.y,
          angle: orbitAngle,
          speed,
          approachOrbitTimer: nextOrbitTimer,
          stateTimer: initial.stateTimer - ctx.dt,
          idleNoisePhase: nextIdleNoise,
        };
      }

      const { nextPhase: diveIdleNoise, noiseX: diveNoiseX, noiseY: diveNoiseY } = advanceIdleNoise(initial.idleNoisePhase, ctx.dt);

      if (dist < ROAMER_BUTTERFLY_APPROACH_DISTANCE_THRESHOLD) {
        ctx.occupantSlots[initial.targetFlowerIndex] = ctx.roamerIndex;
        const sitDuration = pickRandomBetween(
          state.phase + state.wingPhaseLeft + 2.7,
          ROAMER_BUTTERFLY_SIT_DURATION_MIN_MS / 1000,
          ROAMER_BUTTERFLY_SIT_DURATION_MAX_MS / 1000,
        );
        const swingOff = computeFlowerSwingOffset(
          ctx.elapsedMs,
          initial.targetFlowerIndex,
          ctx.flowerSwingAmplitudes,
          ctx.flowerSwingSpeeds,
          ctx.flowerSwingPhases,
          ctx.flowerSwingAngles,
        );
        return {
          ...initial,
          flightState: FlightState.SITTING,
          positionX: targetX + swingOff.x,
          positionY: targetY + swingOff.y,
          bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
          stateTimer: sitDuration,
          sitTimer: sitDuration,
          idleNoisePhase: diveIdleNoise,
          sitWingPauseTimer: 0,
          sitWingPauseTriggered: 0,
        };
      }

      const toFlower = Math.atan2(dy, dx);
      const speed = ROAMER_BUTTERFLY_BASE_SPEED_MIN;
      let x = initial.positionX + Math.cos(toFlower) * speed * ctx.dt + diveNoiseX;
      let y = initial.positionY + Math.sin(toFlower) * speed * ctx.dt + diveNoiseY;

      const clamped = { x: clamp(x, ctx.hardMinX, ctx.hardMaxX), y: clamp(y, ctx.hardMinY, ctx.hardMaxY) };

      return {
        ...initial,
        flightState: FlightState.APPROACH_FLOWER,
        positionX: clamped.x,
        positionY: clamped.y,
        angle: toFlower + Math.PI / 2,
        speed,
        approachOrbitTimer: 0,
        stateTimer: initial.stateTimer - ctx.dt,
        idleNoisePhase: diveIdleNoise,
      };
    }

    case FlightState.SITTING: {
      const sitWingFreq = ROAMER_BUTTERFLY_SIT_WING_FREQ_MIN + pc * (ROAMER_BUTTERFLY_SIT_WING_FREQ_MAX - ROAMER_BUTTERFLY_SIT_WING_FREQ_MIN);
      const nextTimer = initial.stateTimer - ctx.dt;

      let wingL = state.wingPhaseLeft;
      let wingR = state.wingPhaseRight;
      let pauseTimer = initial.sitWingPauseTimer;
      let pauseTriggered = initial.sitWingPauseTriggered;

      if (pauseTimer > 0) {
        pauseTimer = Math.max(0, pauseTimer - ctx.dt);
      } else {
        wingL = state.wingPhaseLeft + sitWingFreq * ctx.dt;
        wingR = state.wingPhaseLeft + sitWingFreq * ctx.dt;

        const sinVal = Math.sin(wingL);
        const absSin = Math.abs(sinVal);
        if (absSin < 0.15) {
          if (pauseTriggered === 0) {
            pauseTriggered = 1;
            pauseTimer = pickRandomBetween(
              state.phase + state.wingPhaseLeft,
              ROAMER_BUTTERFLY_SIT_WING_PAUSE_DURATION_MIN_MS / 1000,
              ROAMER_BUTTERFLY_SIT_WING_PAUSE_DURATION_MAX_MS / 1000,
            );
          }
        } else {
          pauseTriggered = 0;
        }
      }

      if (nextTimer <= 0) {
        ctx.occupantSlots[initial.targetFlowerIndex] = -1;
        return {
          ...state,
          flightState: FlightState.LIFTING_OFF,
          positionX: initial.positionX,
          positionY: initial.positionY,
          bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
          angle: initial.angle,
          speed: initial.speed,
          pathCoeff: initial.pathCoeff,
          phase: state.phase,
          noisePhase: initial.noisePhase,
          idleNoisePhase: initial.idleNoisePhase,
          wingPhaseLeft: wingL,
          wingPhaseRight: wingR,
          targetFlowerIndex: initial.targetFlowerIndex,
          targetFlowerX: initial.targetFlowerX,
          targetFlowerY: initial.targetFlowerY,
          lastTargetFlowerIndex: state.lastTargetFlowerIndex,
          wanderAngle: initial.wanderAngle,
          wanderTargetX: 0,
          wanderTargetY: 0,
          legPhases: initial.legPhases,
          legVisibility: 0,
          sitPhase: 0,
          waitTimer: 0,
          sitTimer: 0,
          stateTimer: ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS / 1000,
          approachOrbitTimer: 0,
          sitWingPauseTimer: 0,
          sitWingPauseTriggered: 0,
        };
      }

      const swingOff = computeFlowerSwingOffset(
        ctx.elapsedMs,
        initial.targetFlowerIndex,
        ctx.flowerSwingAmplitudes,
        ctx.flowerSwingSpeeds,
        ctx.flowerSwingPhases,
        ctx.flowerSwingAngles,
      );

      return {
        ...state,
        flightState: FlightState.SITTING,
        positionX: initial.targetFlowerX + swingOff.x,
        positionY: initial.targetFlowerY + swingOff.y,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
        angle: initial.angle,
        speed: initial.speed,
        pathCoeff: initial.pathCoeff,
        phase: state.phase,
        noisePhase: initial.noisePhase,
        idleNoisePhase: initial.idleNoisePhase,
        wingPhaseLeft: wingL,
        wingPhaseRight: wingR,
        targetFlowerIndex: initial.targetFlowerIndex,
        targetFlowerX: initial.targetFlowerX,
        targetFlowerY: initial.targetFlowerY,
        lastTargetFlowerIndex: state.lastTargetFlowerIndex,
        wanderAngle: initial.wanderAngle,
        wanderTargetX: 0,
        wanderTargetY: 0,
        legPhases: initial.legPhases,
        legVisibility: 0,
        sitPhase: 0,
        waitTimer: 0,
        sitTimer: 0,
        stateTimer: nextTimer,
        approachOrbitTimer: 0,
        sitWingPauseTimer: pauseTimer,
        sitWingPauseTriggered: pauseTriggered,
      };
    }

    case FlightState.LIFTING_OFF: {
      const totalDuration = ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS / 1000;
      const nextTimer = initial.stateTimer - ctx.dt;
      const elapsed = totalDuration - nextTimer;
      const progress = clamp(elapsed / totalDuration, 0, 1);
      const bodyScale = lerp(ROAMER_BUTTERFLY_SIT_BODY_SCALE, 1, progress);
      const { nextPhase: liftNoisePhase, noiseX: liftNoiseX, noiseY: liftNoiseY } = advanceIdleNoise(initial.idleNoisePhase, ctx.dt);

      if (nextTimer <= 0) {
        return {
          ...initial,
          flightState: FlightState.FLYING_CRUISE,
          bodyScale: 1,
          stateTimer: cruiseDurationForPhase(state.phase),
          speed: ROAMER_BUTTERFLY_BASE_SPEED_MIN,
          targetFlowerIndex: -1,
          lastTargetFlowerIndex: initial.targetFlowerIndex,
          approachOrbitTimer: 0,
          idleNoisePhase: liftNoisePhase,
          positionX: initial.positionX + liftNoiseX,
          positionY: initial.positionY + liftNoiseY,
          sitWingPauseTimer: 0,
          sitWingPauseTriggered: 0,
        };
      }

      return {
        ...initial,
        flightState: FlightState.LIFTING_OFF,
        bodyScale,
        stateTimer: nextTimer,
        positionX: initial.positionX + liftNoiseX,
        positionY: initial.positionY + liftNoiseY,
        idleNoisePhase: liftNoisePhase,
      };
    }

    default:
      return initial;
  }
}
