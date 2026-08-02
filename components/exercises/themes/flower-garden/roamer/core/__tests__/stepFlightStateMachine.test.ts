import { FlightState, type RoamerState } from '../types';
import { stepFlightStateMachine, type FlightContext } from '../stepFlightStateMachine';
import { butterflyRoamerConfig } from '../../butterfly/config/butterflySimConfig';
import {
  ROAMER_BUTTERFLY_APPROACH_DISTANCE_THRESHOLD,
  ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS,
  ROAMER_BUTTERFLY_SIT_BODY_SCALE,
  ROAMER_BUTTERFLY_SIT_MOVE_RADIUS,
  ROAMER_BUTTERFLY_SIT_MOVE_SPEED,
  ROAMER_BUTTERFLY_SIT_MOVE_VERTICAL_SQUASH,
  ROAMER_BUTTERFLY_SIT_PAUSE_DURATION_MS,
} from '../../butterfly/config/butterflySimConfig';

function makeState(overrides?: Partial<RoamerState>): RoamerState {
  return {
    flightState: FlightState.FLYING_CRUISE,
    positionX: 200,
    positionY: 300,
    angle: 0,
    speed: 50,
    wingPhaseLeft: 0,
    wingPhaseRight: 0,
    noisePhase: 0,
    idleNoisePhase: 0,
    legPhases: [0, 0, 0, 0, 0, 0],
    bodyScale: 1,
    legVisibility: 0,
    sitPhase: 0,
    phase: 0.5,
    pathCoeff: 0.5,
    wanderAngle: 0,
    targetFlowerIndex: -1,
    targetFlowerX: 0,
    targetFlowerY: 0,
    wanderTargetX: 0,
    wanderTargetY: 0,
    lastTargetFlowerIndex: -1,
    waitTimer: 0,
    sitTimer: 0,
    stateTimer: 10,
    approachOrbitTimer: 0,
    sitWingPauseTimer: 0,
    sitWingPauseTriggered: 0,
    sitOffsetX: 0,
    sitOffsetY: 0,
    sitTargetOffsetX: 0,
    sitTargetOffsetY: 0,
    sitActionTimer: 0,
    exitLegIndex: 0,
    ...overrides,
  };
}

function makeContext(overrides?: Partial<FlightContext>): FlightContext {
  return {
    dt: 0.016,
    steerMinX: 50,
    steerMaxX: 400,
    steerMinY: 50,
    steerMaxY: 400,
    hardMinX: 10,
    hardMaxX: 590,
    hardMinY: 10,
    hardMaxY: 590,
    centerX: 300,
    centerY: 300,
    fieldFlowerAnchorsX: [200, 400],
    fieldFlowerAnchorsY: [350, 250],
    occupantSlots: [-1, -1],
    roamerIndex: 0,
    elapsedMs: 1000,
    flowerSwingAmplitudes: [0, 0],
    flowerSwingSpeeds: [0, 0],
    flowerSwingPhases: [0, 0],
    flowerSwingAngles: [0, 0],
    boostsMutable: [0, 0],
    exitLegsX: [200, 300],
    exitLegsY: [100, -180],
    ...overrides,
  };
}

const config = butterflyRoamerConfig;

describe('stepFlightStateMachine', () => {
  describe('APPROACH_FLOWER state', () => {
    it('transitions to SITTING when close to target', () => {
      const flowerX = 200;
      const flowerY = 350;
      const state = makeState({
        flightState: FlightState.APPROACH_FLOWER,
        positionX: flowerX,
        positionY: flowerY - ROAMER_BUTTERFLY_APPROACH_DISTANCE_THRESHOLD + 1,
        targetFlowerIndex: 0,
        targetFlowerX: flowerX,
        targetFlowerY: flowerY,
      });
      const ctx = makeContext();
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.flightState).toBe(FlightState.SITTING);
      expect(next.bodyScale).toBe(ROAMER_BUTTERFLY_SIT_BODY_SCALE);
    });

    it('writes roamer index to occupant slot on landing', () => {
      const flowerX = 200;
      const flowerY = 350;
      const occupantSlots = [-1, -1];
      const state = makeState({
        flightState: FlightState.APPROACH_FLOWER,
        positionX: flowerX,
        positionY: flowerY - ROAMER_BUTTERFLY_APPROACH_DISTANCE_THRESHOLD + 1,
        targetFlowerIndex: 0,
        targetFlowerX: flowerX,
        targetFlowerY: flowerY,
      });
      const ctx = makeContext({ occupantSlots });
      stepFlightStateMachine(state, ctx, config);
      expect(occupantSlots[0]).toBe(0);
    });

    it('approaches target when far', () => {
      const state = makeState({
        flightState: FlightState.APPROACH_FLOWER,
        positionX: 100,
        positionY: 100,
        targetFlowerIndex: 1,
        targetFlowerX: 400,
        targetFlowerY: 250,
      });
      const ctx = makeContext({ dt: 0.1 });
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.flightState).toBe(FlightState.APPROACH_FLOWER);
      const dx = next.positionX - state.positionX;
      const dy = next.positionY - state.positionY;
      expect(Math.abs(dx) + Math.abs(dy)).toBeGreaterThan(0);
    });
  });

  describe('SITTING state: entry initialization', () => {
    it('sets sitOffsetX/Y to 0 and picks target offset on APPROACH_FLOWER → SITTING', () => {
      const flowerX = 200;
      const flowerY = 350;
      const state = makeState({
        flightState: FlightState.APPROACH_FLOWER,
        positionX: flowerX,
        positionY: flowerY - ROAMER_BUTTERFLY_APPROACH_DISTANCE_THRESHOLD + 1,
        targetFlowerIndex: 0,
        targetFlowerX: flowerX,
        targetFlowerY: flowerY,
      });
      const ctx = makeContext();
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.sitOffsetX).toBe(0);
      expect(next.sitOffsetY).toBe(0);
      expect(next.sitActionTimer).toBe(0);
      const dist = Math.sqrt(
        next.sitTargetOffsetX * next.sitTargetOffsetX +
        next.sitTargetOffsetY * next.sitTargetOffsetY,
      );
      expect(dist).toBeLessThanOrEqual(ROAMER_BUTTERFLY_SIT_MOVE_RADIUS + 0.01);
    });
  });

  describe('SITTING state: movement toward target', () => {
    it('moves sitOffset toward sitTargetOffset when sitActionTimer is 0', () => {
      const state = makeState({
        flightState: FlightState.SITTING,
        stateTimer: 10,
        sitOffsetX: 0,
        sitOffsetY: 0,
        sitTargetOffsetX: 10,
        sitTargetOffsetY: 0,
        sitActionTimer: 0,
        positionX: 200,
        positionY: 350,
        targetFlowerX: 200,
        targetFlowerY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });
      const ctx = makeContext({ dt: 0.1 });
      const next = stepFlightStateMachine(state, ctx, config);
      const expectedStep = ROAMER_BUTTERFLY_SIT_MOVE_SPEED * 0.1;
      expect(next.sitOffsetX).toBeCloseTo(expectedStep, 2);
      expect(next.sitOffsetY).toBe(0);
      expect(next.sitActionTimer).toBe(0);
    });
  });

  describe('SITTING state: reaching target picks next target then pauses', () => {
    it('snaps to current target, picks new target, sets pause timer', () => {
      const state = makeState({
        flightState: FlightState.SITTING,
        stateTimer: 10,
        sitOffsetX: 9.5,
        sitOffsetY: 0,
        sitTargetOffsetX: 10,
        sitTargetOffsetY: 0,
        sitActionTimer: 0,
        positionX: 200,
        positionY: 350,
        targetFlowerX: 200,
        targetFlowerY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });
      const ctx = makeContext({ dt: 0.1 });
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.sitOffsetX).toBeCloseTo(10, 4);
      expect(next.sitActionTimer).toBeGreaterThan(0);
      expect(next.sitActionTimer).toBeCloseTo(ROAMER_BUTTERFLY_SIT_PAUSE_DURATION_MS / 1000, 2);
      const nextTargetDist = Math.sqrt(
        next.sitTargetOffsetX * next.sitTargetOffsetX +
        next.sitTargetOffsetY * next.sitTargetOffsetY,
      );
      expect(nextTargetDist).toBeLessThanOrEqual(ROAMER_BUTTERFLY_SIT_MOVE_RADIUS + 0.01);
    });
  });

  describe('SITTING state: pausing between moves', () => {
    it('counts down sitActionTimer while pausing', () => {
      const state = makeState({
        flightState: FlightState.SITTING,
        stateTimer: 10,
        sitOffsetX: 10,
        sitOffsetY: 0,
        sitTargetOffsetX: 10,
        sitTargetOffsetY: 0,
        sitActionTimer: 2,
        positionX: 200,
        positionY: 350,
        targetFlowerX: 200,
        targetFlowerY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });
      const ctx = makeContext({ dt: 0.5 });
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.sitActionTimer).toBeCloseTo(1.5, 4);
      expect(next.sitOffsetX).toBe(10);
      expect(next.sitOffsetY).toBe(0);
    });
  });

  describe('SITTING state: angle faces movement direction', () => {
    it('angle lerps toward atan2 of target direction', () => {
      const state = makeState({
        flightState: FlightState.SITTING,
        stateTimer: 10,
        sitOffsetX: 0,
        sitOffsetY: 0,
        sitTargetOffsetX: 10,
        sitTargetOffsetY: 10,
        sitActionTimer: 0,
        angle: 0,
        positionX: 200,
        positionY: 350,
        targetFlowerX: 200,
        targetFlowerY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });
      const ctx = makeContext({ dt: 0.3 });
      const next = stepFlightStateMachine(state, ctx, config);
      const desiredAngle = Math.atan2(10, 10);
      expect(next.angle).toBeGreaterThan(0);
      expect(next.angle).toBeLessThan(desiredAngle);
    });
  });

  describe('SITTING → LIFTING_OFF transition', () => {
    it('clears occupant slot when transitioning to LIFTING_OFF', () => {
      const occupantSlots = [0, -1];
      const state = makeState({
        flightState: FlightState.SITTING,
        stateTimer: 0.01,
        positionX: 200,
        positionY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
        targetFlowerIndex: 0,
      });
      const ctx = makeContext({ dt: 0.02, occupantSlots });
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.flightState).toBe(FlightState.LIFTING_OFF);
      expect(occupantSlots[0]).toBe(-1);
    });
  });

  describe('FLYING_TURN state', () => {
    it('stays in FLYING_TURN while timer is positive', () => {
      const state = makeState({
        flightState: FlightState.FLYING_TURN,
        stateTimer: 0.5,
        wanderAngle: Math.PI / 2,
        positionX: 200,
        positionY: 300,
      });
      const ctx = makeContext({ dt: 0.1 });
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.flightState).toBe(FlightState.FLYING_TURN);
      expect(next.stateTimer).toBeCloseTo(0.4, 4);
    });

    it('transitions to FLYING_CRUISE when timer expires', () => {
      const state = makeState({
        flightState: FlightState.FLYING_TURN,
        stateTimer: 0.01,
        wanderAngle: Math.PI / 2,
        positionX: 200,
        positionY: 300,
      });
      const ctx = makeContext({ dt: 0.02 });
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.flightState).toBe(FlightState.FLYING_CRUISE);
    });
  });

  describe('LIFTING_OFF state', () => {
    it('lerps bodyScale back to 1', () => {
      const state = makeState({
        flightState: FlightState.LIFTING_OFF,
        positionX: 200,
        positionY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
        stateTimer: ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS / 1000,
        targetFlowerIndex: 0,
      });
      const halfWay = (ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS / 1000) / 2;
      const ctx = makeContext({ dt: halfWay });
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.bodyScale).toBeGreaterThan(ROAMER_BUTTERFLY_SIT_BODY_SCALE);
      expect(next.bodyScale).toBeLessThan(1);
    });

    it('transitions to FLYING_CRUISE when done', () => {
      const state = makeState({
        flightState: FlightState.LIFTING_OFF,
        positionX: 200,
        positionY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
        stateTimer: 0.01,
        targetFlowerIndex: 0,
      });
      const ctx = makeContext({ dt: 0.02 });
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.flightState).toBe(FlightState.FLYING_CRUISE);
      expect(next.bodyScale).toBe(1);
    });
  });

  describe('ESCAPING state', () => {
    it('flies toward the rose leg and keeps the state', () => {
      const state = makeState({
        flightState: FlightState.ESCAPING,
        positionX: 100,
        positionY: 400,
        exitLegIndex: 0,
      });
      const ctx = makeContext({
        exitLegsX: [200, 300],
        exitLegsY: [100, -180],
      });
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.flightState).toBe(FlightState.ESCAPING);
      expect(next.exitLegIndex).toBe(0);
      expect(next.positionX).toBeGreaterThan(100);
      expect(next.positionY).toBeLessThan(400);
    });

    it('advances to the off-screen leg when the rose is reached', () => {
      const state = makeState({
        flightState: FlightState.ESCAPING,
        positionX: 200,
        positionY: 100,
        exitLegIndex: 0,
      });
      const ctx = makeContext({
        exitLegsX: [200, 300],
        exitLegsY: [100, -180],
      });
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.flightState).toBe(FlightState.ESCAPING);
      expect(next.exitLegIndex).toBe(1);
    });

    it('transitions to ESCAPED on arrival at the final leg', () => {
      const state = makeState({
        flightState: FlightState.ESCAPING,
        positionX: 300,
        positionY: -180,
        exitLegIndex: 1,
      });
      const ctx = makeContext({
        exitLegsX: [200, 300],
        exitLegsY: [100, -180],
      });
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.flightState).toBe(FlightState.ESCAPED);
      expect(next.positionX).toBe(300);
      expect(next.positionY).toBe(-180);
    });

    it('flights faster than cruise when fully accelerated', () => {
      const state = makeState({
        flightState: FlightState.ESCAPING,
        positionX: 100,
        positionY: 400,
        speed: config.baseSpeedMax,
      });
      const ctx = makeContext({
        exitLegsX: [200, 300],
        exitLegsY: [100, -180],
        dt: 1.0,
      });
      const next = stepFlightStateMachine(state, ctx, config);
      expect(next.speed).toBeCloseTo(
        config.baseSpeedMax * config.exitSpeedMultiplier,
        5,
      );
    });

    it('advances the noise phase while escaping', () => {
      const state = makeState({
        flightState: FlightState.ESCAPING,
        positionX: 100,
        positionY: 400,
        noisePhase: 0,
      });
      const next = stepFlightStateMachine(state, makeContext(), config);
      expect(next.noisePhase).toBeGreaterThan(0);
    });

    it('weaves perpendicular to the flight line instead of flying straight', () => {
      const noiseFreq =
        config.noiseFreqMin + 0.5 * (config.noiseFreqMax - config.noiseFreqMin);
      const noisePhase = Math.PI / 2 - noiseFreq * 0.016;
      const state = makeState({
        flightState: FlightState.ESCAPING,
        positionX: 100,
        positionY: 400,
        noisePhase,
      });
      const next = stepFlightStateMachine(state, makeContext(), config);
      const perpendicularOffset =
        (config.noiseAmplitudeMin +
          0.5 * (config.noiseAmplitudeMax - config.noiseAmplitudeMin)) *
        config.exitNoiseScale *
        0.016;
      expect(next.positionX).toBeGreaterThan(100 + perpendicularOffset * 0.9);
    });

    it('decelerates when close to the waypoint so it can converge', () => {
      const exitSpeed = config.baseSpeedMax * config.exitSpeedMultiplier;
      const state = makeState({
        flightState: FlightState.ESCAPING,
        positionX: 200,
        positionY: 125,
        speed: exitSpeed,
      });
      const next = stepFlightStateMachine(state, makeContext(), config);
      expect(next.speed).toBeLessThan(exitSpeed);
      expect(next.speed).toBeGreaterThan(exitSpeed * config.exitMinSpeedRatio * 0.5);
    });
  });

  describe('ESCAPED state', () => {
    it('stays put and keeps the terminal state', () => {
      const state = makeState({
        flightState: FlightState.ESCAPED,
        positionX: 300,
        positionY: -180,
      });
      const next = stepFlightStateMachine(state, makeContext(), config);
      expect(next.flightState).toBe(FlightState.ESCAPED);
      expect(next.positionX).toBe(300);
      expect(next.positionY).toBe(-180);
    });
  });
});
