import { FlightState, type RoamerState } from './types';
import type { RoamerConfig } from './roamerConfig';
import {
  clamp,
  cruiseDurationForPhase,
  idleDurationForPhase,
  lerp,
  lerpAngle,
  normalizeAngle,
  pickErraticWanderAngle,
} from './roamerSimHelpers';
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
  boostsMutable: number[];
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
  boostAmount: number,
): { x: number; y: number } {
  'worklet';
  const amp = (swingAmplitudes[flowerIndex] ?? 0) + boostAmount;
  const speed = swingSpeeds[flowerIndex] ?? 0;
  const phase = swingPhases[flowerIndex] ?? 0;
  const angle = swingAngles[flowerIndex] ?? 0;
  const swing = Math.sin((elapsedMs / 1000) * speed + phase) * amp;
  return { x: swing * Math.cos(angle), y: swing * Math.sin(angle) };
}

function advanceIdleNoise(
  phase: number, dt: number, config: RoamerConfig,
): { nextPhase: number; noiseX: number; noiseY: number } {
  'worklet';
  const nextPhase = phase + config.idleNoiseFrequency * dt;
  const amp = config.idleNoiseAmplitude * dt;
  return {
    nextPhase,
    noiseX: Math.sin(nextPhase) * amp,
    noiseY: Math.sin(nextPhase * 1.7 + 1.3) * amp,
  };
}

export function stepFlightStateMachine(
  state: RoamerState,
  ctx: FlightContext,
  config: RoamerConfig,
): RoamerState {
  'worklet';

  const pc = state.pathCoeff;

  const wingFreq = config.wingFreqMin + pc * (config.wingFreqMax - config.wingFreqMin);

  const nextWingL = state.wingPhaseLeft + wingFreq * ctx.dt;
  const nextWingR = state.wingPhaseLeft + wingFreq * ctx.dt;

  const initial = {
    ...state,
    wingPhaseLeft: nextWingL,
    wingPhaseRight: nextWingR,
  };

  switch (state.flightState) {
    case FlightState.FLYING_TURN: {
      const turnTargetSpeed = config.baseSpeedMin + pc * (config.baseSpeedMax - config.baseSpeedMin) * 0.5;
      const speed = lerp(initial.speed, turnTargetSpeed, Math.min(1, config.speedLerpFactor * ctx.dt));
      const angle = lerpAngle(initial.angle, initial.wanderAngle, Math.min(1, 3.0 * ctx.dt));
      const moveAngle = angle - Math.PI / 2;
      let x = initial.positionX + Math.cos(moveAngle) * speed * ctx.dt;
      let y = initial.positionY + Math.sin(moveAngle) * speed * ctx.dt;
      const clamped = { x: clamp(x, ctx.hardMinX, ctx.hardMaxX), y: clamp(y, ctx.hardMinY, ctx.hardMaxY) };
      const nextTimer = initial.stateTimer - ctx.dt;

      if (nextTimer <= 0) {
        return {
          ...initial,
          flightState: FlightState.FLYING_CRUISE,
          positionX: clamped.x,
          positionY: clamped.y,
          angle,
          speed,
          stateTimer: cruiseDurationForPhase(state.phase, config),
          legPhases: initial.legPhases,
          legVisibility: 0,
        };
      }

      return {
        ...initial,
        flightState: FlightState.FLYING_TURN,
        positionX: clamped.x,
        positionY: clamped.y,
        angle,
        speed,
        stateTimer: nextTimer,
        legPhases: initial.legPhases,
        legVisibility: 0,
      };
    }

    case FlightState.FLYING_CRUISE: {
      const targetSpeed = config.baseSpeedMin + pc * (config.baseSpeedMax - config.baseSpeedMin);
      const speed = lerp(initial.speed, targetSpeed, Math.min(1, config.speedLerpFactor * ctx.dt));
      const angle = lerpAngle(initial.angle, initial.wanderAngle, Math.min(1, config.wanderLerp * ctx.dt));

      const noiseFreq = config.noiseFreqMin + pc * (config.noiseFreqMax - config.noiseFreqMin);
      const nextNoisePhase = initial.noisePhase + noiseFreq * ctx.dt;
      const noiseAmp = config.noiseAmplitudeMin + pc * (config.noiseAmplitudeMax - config.noiseAmplitudeMin);
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
        wanderAngle = toCenter + Math.PI / 2 + Math.sin(state.phase * 5.1) * config.boundaryTurnOffset;
      }

      const clamped = { x: clamp(x, ctx.hardMinX, ctx.hardMaxX), y: clamp(y, ctx.hardMinY, ctx.hardMaxY) };

      let nextState = initial.flightState;
      let nextTimer = initial.stateTimer - ctx.dt;

      if (nextTimer <= 0) {
        const roll = Math.abs(Math.sin(state.phase * 17.3 + nextWingL * 3.1));
        if (roll < config.flightPickFlowerProbability) {
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
              config.approachOrbitDurationMin,
              config.approachOrbitDurationMax,
            );
            return {
              ...initial,
              flightState: FlightState.APPROACH_FLOWER,
              positionX: clamped.x,
              positionY: clamped.y,
              angle,
              speed: config.baseSpeedMin,
              targetFlowerIndex: targetId,
              targetFlowerX: ctx.fieldFlowerAnchorsX[targetId]!,
              targetFlowerY: ctx.fieldFlowerAnchorsY[targetId]!,
              stateTimer: orbitDuration,
              approachOrbitTimer: orbitDuration,
              noisePhase: nextNoisePhase,
              legPhases: initial.legPhases,
              legVisibility: 0,
            };
          }
        }
        nextState = FlightState.FLYING_IDLE;
        nextTimer = idleDurationForPhase(state.phase, config);
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
        legPhases: initial.legPhases,
        legVisibility: 0,
      };
    }

    case FlightState.FLYING_IDLE: {
      const idleNoisePhase = initial.idleNoisePhase + config.idleNoiseFrequency * ctx.dt;
      const idleAmp = config.idleNoiseAmplitude * ctx.dt;
      const idleNoiseX = Math.sin(idleNoisePhase) * idleAmp;
      const idleNoiseY = Math.sin(idleNoisePhase * 1.7 + 1.3) * idleAmp;
      const driftAngle = state.phase * 2.0 + nextWingL * 0.3;
      let x = initial.positionX + Math.cos(driftAngle) * config.idleDriftSpeed * ctx.dt + idleNoiseX;
      let y = initial.positionY + Math.sin(driftAngle) * config.idleDriftSpeed * ctx.dt + idleNoiseY;

      const clamped = { x: clamp(x, ctx.hardMinX, ctx.hardMaxX), y: clamp(y, ctx.hardMinY, ctx.hardMaxY) };

      let nextState = initial.flightState;
      let nextTimer = initial.stateTimer - ctx.dt;
      let newPathCoeff = initial.pathCoeff;
      let newWanderAngle = initial.wanderAngle;

      if (nextTimer <= 0) {
        nextState = FlightState.FLYING_CRUISE;
        newPathCoeff = 0.5 + 0.5 * Math.sin(nextWingL * 3.17 + state.phase * 5.23);
        nextTimer = cruiseDurationForPhase(state.phase, config);
        newWanderAngle = pickErraticWanderAngle(initial.angle, state.phase, 0);
      }

      return {
        ...initial,
        flightState: nextState,
        positionX: clamped.x,
        positionY: clamped.y,
        speed: config.idleDriftSpeed,
        idleNoisePhase,
        pathCoeff: newPathCoeff,
        wanderAngle: newWanderAngle,
        stateTimer: nextTimer,
        legPhases: initial.legPhases,
        legVisibility: 0,
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
        const speed = config.baseSpeedMin;
        const { nextPhase: nextIdleNoise, noiseX, noiseY } = advanceIdleNoise(initial.idleNoisePhase, ctx.dt, config);
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
                legPhases: initial.legPhases,
                legVisibility: 0,
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
              config.approachOrbitDurationMin,
              config.approachOrbitDurationMax,
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
              legPhases: initial.legPhases,
              legVisibility: 0,
            };
          }

          return {
            ...initial,
            flightState: FlightState.FLYING_CRUISE,
            positionX: clamped.x,
            positionY: clamped.y,
            angle: orbitAngle,
            speed: config.baseSpeedMin,
            targetFlowerIndex: -1,
            approachOrbitTimer: 0,
            stateTimer: cruiseDurationForPhase(state.phase, config),
            idleNoisePhase: nextIdleNoise,
            legPhases: initial.legPhases,
            legVisibility: 0,
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
          legPhases: initial.legPhases,
          legVisibility: 0,
        };
      }

      const { nextPhase: diveIdleNoise, noiseX: diveNoiseX, noiseY: diveNoiseY } = advanceIdleNoise(initial.idleNoisePhase, ctx.dt, config);

      if (dist < config.approachDistanceThreshold) {
        ctx.occupantSlots[initial.targetFlowerIndex] = ctx.roamerIndex;
        const sitDuration = pickRandomBetween(
          state.phase + state.wingPhaseLeft + 2.7,
          config.sitDurationMinMs / 1000,
          config.sitDurationMaxMs / 1000,
        );
        const fi = initial.targetFlowerIndex;
        ctx.boostsMutable[fi] = (ctx.boostsMutable[fi] ?? 0) + config.landAmplitudeBoost;
        const swingOff = computeFlowerSwingOffset(
          ctx.elapsedMs,
          fi,
          ctx.flowerSwingAmplitudes,
          ctx.flowerSwingSpeeds,
          ctx.flowerSwingPhases,
          ctx.flowerSwingAngles,
          ctx.boostsMutable[fi],
        );
        const targetAngle = Math.sin(state.phase * 7.7 + state.wingPhaseLeft * 3.1) * Math.PI;
        const targetRadius = (Math.abs(Math.sin(state.phase * 11.3 + state.wingPhaseLeft * 5.7 + 1.3))) * config.sitMoveRadius;
        const initTargetOffX = Math.cos(targetAngle) * targetRadius;
        const initTargetOffY = Math.sin(targetAngle) * targetRadius * config.sitMoveVerticalSquash;
        return {
          ...initial,
          flightState: FlightState.SITTING,
          positionX: targetX + swingOff.x,
          positionY: targetY + swingOff.y,
          bodyScale: config.sitBodyScale,
          stateTimer: sitDuration,
          sitTimer: sitDuration,
          idleNoisePhase: diveIdleNoise,
          sitWingPauseTimer: 0,
          sitWingPauseTriggered: 0,
          sitOffsetX: 0,
          sitOffsetY: 0,
          sitTargetOffsetX: initTargetOffX,
          sitTargetOffsetY: initTargetOffY,
          sitActionTimer: 0,
          legPhases: initial.legPhases,
          legVisibility: 0,
        };
      }

      const toFlower = Math.atan2(dy, dx);
      const speed = config.baseSpeedMin;
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
        legPhases: initial.legPhases,
        legVisibility: 0,
      };
    }

    case FlightState.SITTING: {
      const sitWingFreq = config.sitWingFreqMin + pc * (config.sitWingFreqMax - config.sitWingFreqMin);
      const nextTimer = initial.stateTimer - ctx.dt;

      const preTakeoffThreshold = config.sitWingPreTakeoffDurationMs / 1000;
      const isPreTakeoff = nextTimer > 0 && nextTimer <= preTakeoffThreshold;

      let wingL = state.wingPhaseLeft;
      let wingR = state.wingPhaseRight;
      let pauseTimer = initial.sitWingPauseTimer;
      let pauseTriggered = initial.sitWingPauseTriggered;

      if (isPreTakeoff) {
        const preTakeoffWingFreq = config.wingFreqMin + pc * (config.wingFreqMax - config.wingFreqMin);
        wingL = state.wingPhaseLeft + preTakeoffWingFreq * ctx.dt;
        wingR = state.wingPhaseLeft + preTakeoffWingFreq * ctx.dt;
        pauseTimer = 0;
        pauseTriggered = 0;
      } else if (pauseTimer > 0) {
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
              config.sitWingPauseDurationMinMs / 1000,
              config.sitWingPauseDurationMaxMs / 1000,
            );
          }
        } else {
          pauseTriggered = 0;
        }
      }

      let nextOffsetX = initial.sitOffsetX;
      let nextOffsetY = initial.sitOffsetY;
      let nextTargetX = initial.sitTargetOffsetX;
      let nextTargetY = initial.sitTargetOffsetY;
      let nextActionTimer = initial.sitActionTimer;
      const legPhases = [...initial.legPhases];
      let isMoving = false;

      if (nextActionTimer > 0) {
        nextActionTimer = Math.max(0, nextActionTimer - ctx.dt);
      }

      if (nextActionTimer <= 0) {
        const dx = nextTargetX - nextOffsetX;
        const dy = nextTargetY - nextOffsetY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) {
          nextOffsetX = nextTargetX;
          nextOffsetY = nextTargetY;
          const newAngle = Math.sin(state.phase * 7.7 + wingL * 3.1 + initial.stateTimer * 1.3) * Math.PI;
          const newRadius = (Math.abs(Math.sin(state.phase * 11.3 + wingL * 5.7 + initial.stateTimer * 2.1))) * config.sitMoveRadius;
          nextTargetX = Math.cos(newAngle) * newRadius;
          nextTargetY = Math.sin(newAngle) * newRadius * config.sitMoveVerticalSquash;
          nextActionTimer = config.sitPauseDurationMs / 1000;
        } else {
          isMoving = true;
          const step = config.sitMoveSpeed * ctx.dt;
          const clampedStep = Math.min(step, dist);
          nextOffsetX += (dx / dist) * clampedStep;
          nextOffsetY += (dy / dist) * clampedStep;
        }
      }

      const legVisibility = 1;

      if (nextTimer <= 0) {
        ctx.occupantSlots[initial.targetFlowerIndex] = -1;
        const tfi = initial.targetFlowerIndex;
        ctx.boostsMutable[tfi] = (ctx.boostsMutable[tfi] ?? 0) + config.takeoffAmplitudeBoost;
        return {
          ...state,
          flightState: FlightState.LIFTING_OFF,
          positionX: initial.positionX,
          positionY: initial.positionY,
          bodyScale: config.sitBodyScale,
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
          legPhases: legPhases,
          legVisibility,
          waitTimer: 0,
          sitTimer: 0,
          stateTimer: config.liftOffDurationMs / 1000,
          approachOrbitTimer: 0,
          sitWingPauseTimer: 0,
          sitWingPauseTriggered: 0,
          sitOffsetX: nextOffsetX,
          sitOffsetY: nextOffsetY,
          sitTargetOffsetX: nextTargetX,
          sitTargetOffsetY: nextTargetY,
          sitActionTimer: nextActionTimer,
        };
      }

      const sfi = initial.targetFlowerIndex;
      const swingOff = computeFlowerSwingOffset(
        ctx.elapsedMs,
        sfi,
        ctx.flowerSwingAmplitudes,
        ctx.flowerSwingSpeeds,
        ctx.flowerSwingPhases,
        ctx.flowerSwingAngles,
        ctx.boostsMutable[sfi] ?? 0,
      );

      const posX = initial.targetFlowerX + swingOff.x + nextOffsetX;
      const posY = initial.targetFlowerY + swingOff.y + nextOffsetY;

      const moveDx = nextTargetX - nextOffsetX;
      const moveDy = nextTargetY - nextOffsetY;
      const moveDist = Math.sqrt(moveDx * moveDx + moveDy * moveDy);
      const desiredAngle = moveDist > 0.5 ? Math.atan2(moveDy, moveDx) : initial.angle;
      const angle = lerpAngle(initial.angle, desiredAngle, Math.min(1, config.sitMoveTurnSpeed * ctx.dt));

      if (isMoving || Math.abs(normalizeAngle(desiredAngle - initial.angle)) > 0.01) {
        for (let i = 0; i < 6; i++) {
          legPhases[i] = initial.legPhases[i]! + config.legFrequency * ctx.dt;
        }
      }

      return {
        ...state,
        flightState: FlightState.SITTING,
        positionX: posX,
        positionY: posY,
        bodyScale: config.sitBodyScale,
        angle,
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
        legPhases,
        legVisibility,
        waitTimer: 0,
        sitTimer: 0,
        stateTimer: nextTimer,
        approachOrbitTimer: 0,
        sitWingPauseTimer: pauseTimer,
        sitWingPauseTriggered: pauseTriggered,
        sitOffsetX: nextOffsetX,
        sitOffsetY: nextOffsetY,
        sitTargetOffsetX: nextTargetX,
        sitTargetOffsetY: nextTargetY,
        sitActionTimer: nextActionTimer,
      };
    }

    case FlightState.LIFTING_OFF: {
      const totalDuration = config.liftOffDurationMs / 1000;
      const nextTimer = initial.stateTimer - ctx.dt;
      const elapsed = totalDuration - nextTimer;
      const progress = clamp(elapsed / totalDuration, 0, 1);
      const bodyScale = lerp(config.sitBodyScale, 1, progress);
      const { nextPhase: liftNoisePhase, noiseX: liftNoiseX, noiseY: liftNoiseY } = advanceIdleNoise(initial.idleNoisePhase, ctx.dt, config);
      const legVisibility = 0;

      if (nextTimer <= 0) {
        return {
          ...initial,
          flightState: FlightState.FLYING_CRUISE,
          bodyScale: 1,
          stateTimer: cruiseDurationForPhase(state.phase, config),
          speed: config.baseSpeedMin,
          targetFlowerIndex: -1,
          lastTargetFlowerIndex: initial.targetFlowerIndex,
          approachOrbitTimer: 0,
          idleNoisePhase: liftNoisePhase,
          positionX: initial.positionX + liftNoiseX,
          positionY: initial.positionY + liftNoiseY,
          sitWingPauseTimer: 0,
          sitWingPauseTriggered: 0,
          legPhases: initial.legPhases,
          legVisibility: 0,
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
        legPhases: initial.legPhases,
        legVisibility,
      };
    }

    default:
      return initial;
  }
}
