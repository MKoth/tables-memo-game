import { FlightState, type ButterflyState } from '../simulation/types';
import { stepFlightStateMachine, type FlightContext } from '../simulation/stepFlightStateMachine';
import {
  ROAMER_BUTTERFLY_LEG_FREQUENCY,
  ROAMER_BUTTERFLY_LEG_VISIBILITY_FADE_IN_MS,
  ROAMER_BUTTERFLY_LEG_VISIBILITY_FADE_OUT_MS,
  ROAMER_BUTTERFLY_SIT_BODY_SCALE,
  ROAMER_BUTTERFLY_LEG_TRIPOD_OFFSETS,
} from '../config/butterflySimConfig';

function makeState(overrides?: Partial<ButterflyState>): ButterflyState {
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
    ...overrides,
  };
}

describe('leg phase advancement', () => {
  it('advances leg phases when moving on flower in SITTING', () => {
    const state = makeState({
      flightState: FlightState.SITTING,
      positionX: 200,
      positionY: 350,
      targetFlowerX: 200,
      targetFlowerY: 350,
      bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      sitOffsetX: 0,
      sitOffsetY: 0,
      sitTargetOffsetX: 10,
      sitTargetOffsetY: 0,
      sitActionTimer: 0,
      stateTimer: 10,
      legPhases: [0, 0, 0, 0, 0, 0],
    });
    const ctx = makeContext({ dt: 0.1 });
    const next = stepFlightStateMachine(state, ctx);

    const expectedAdvance = ROAMER_BUTTERFLY_LEG_FREQUENCY * 0.1;
    for (let i = 0; i < 6; i++) {
      expect(next.legPhases[i]).toBeCloseTo(expectedAdvance, 5);
    }
  });

  it('holds leg phases when paused in SITTING (sitActionTimer > 0)', () => {
    const state = makeState({
      flightState: FlightState.SITTING,
      positionX: 200,
      positionY: 350,
      targetFlowerX: 200,
      targetFlowerY: 350,
      bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      sitOffsetX: 10,
      sitOffsetY: 0,
      sitTargetOffsetX: 10,
      sitTargetOffsetY: 0,
      sitActionTimer: 1.0,
      stateTimer: 10,
      legPhases: [1, 2, 3, 4, 5, 6],
      legVisibility: 1,
    });
    const ctx = makeContext({ dt: 0.1 });
    const next = stepFlightStateMachine(state, ctx);

    for (let i = 0; i < 6; i++) {
      expect(next.legPhases[i]).toBeCloseTo(state.legPhases[i]!, 5);
    }
  });

  it('holds leg phases when at target in SITTING (dist < 1)', () => {
    const state = makeState({
      flightState: FlightState.SITTING,
      positionX: 200,
      positionY: 350,
      targetFlowerX: 200,
      targetFlowerY: 350,
      bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      sitOffsetX: 9.5,
      sitOffsetY: 0,
      sitTargetOffsetX: 10,
      sitTargetOffsetY: 0,
      sitActionTimer: 0,
      stateTimer: 10,
      legPhases: [1, 2, 3, 4, 5, 6],
      legVisibility: 1,
    });
    const ctx = makeContext({ dt: 0.1 });
    const next = stepFlightStateMachine(state, ctx);

    expect(next.sitOffsetX).toBeCloseTo(10, 4);
    expect(next.sitActionTimer).toBeGreaterThan(0);
    for (let i = 0; i < 6; i++) {
      expect(next.legPhases[i]).toBeCloseTo(state.legPhases[i]!, 5);
    }
  });

  it('holds leg phases in FLYING_CRUISE state', () => {
    const state = makeState({
      flightState: FlightState.FLYING_CRUISE,
      legPhases: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
      stateTimer: 10,
    });
    const ctx = makeContext({ dt: 0.1 });
    const next = stepFlightStateMachine(state, ctx);

    for (let i = 0; i < 6; i++) {
      expect(next.legPhases[i]).toBeCloseTo(state.legPhases[i]!, 5);
    }
  });

  it('holds leg phases in FLYING_IDLE state', () => {
    const state = makeState({
      flightState: FlightState.FLYING_IDLE,
      legPhases: [1, 2, 3, 4, 5, 6],
      stateTimer: 1,
    });
    const ctx = makeContext({ dt: 0.1 });
    const next = stepFlightStateMachine(state, ctx);

    for (let i = 0; i < 6; i++) {
      expect(next.legPhases[i]).toBeCloseTo(state.legPhases[i]!, 5);
    }
  });

  it('holds leg phases in APPROACH_FLOWER state', () => {
    const state = makeState({
      flightState: FlightState.APPROACH_FLOWER,
      positionX: 100,
      positionY: 100,
      targetFlowerIndex: 1,
      targetFlowerX: 400,
      targetFlowerY: 250,
      legPhases: [1, 2, 3, 4, 5, 6],
    });
    const ctx = makeContext({ dt: 0.1 });
    const next = stepFlightStateMachine(state, ctx);

    for (let i = 0; i < 6; i++) {
      expect(next.legPhases[i]).toBeCloseTo(state.legPhases[i]!, 5);
    }
  });

  it('holds leg phases in LIFTING_OFF state', () => {
    const state = makeState({
      flightState: FlightState.LIFTING_OFF,
      positionX: 200,
      positionY: 350,
      bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      stateTimer: 0.3,
      targetFlowerIndex: 0,
      legPhases: [1, 2, 3, 4, 5, 6],
    });
    const ctx = makeContext({ dt: 0.1 });
    const next = stepFlightStateMachine(state, ctx);

    for (let i = 0; i < 6; i++) {
      expect(next.legPhases[i]).toBeCloseTo(state.legPhases[i]!, 5);
    }
  });

  it('all six legs advance in the same direction (all increase)', () => {
    const state = makeState({
      flightState: FlightState.SITTING,
      positionX: 200,
      positionY: 350,
      targetFlowerX: 200,
      targetFlowerY: 350,
      bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      sitOffsetX: 0,
      sitOffsetY: 0,
      sitTargetOffsetX: 10,
      sitTargetOffsetY: 0,
      sitActionTimer: 0,
      stateTimer: 10,
      legPhases: [0, 0, 0, 0, 0, 0],
    });
    const ctx = makeContext({ dt: 0.5 });
    const next = stepFlightStateMachine(state, ctx);

    for (let i = 0; i < 6; i++) {
      expect(next.legPhases[i]!).toBeGreaterThan(state.legPhases[i]!);
    }
  });
});

describe('legVisibility lerp', () => {
  it('legVisibility fades in on SITTING', () => {
    const state = makeState({
      flightState: FlightState.SITTING,
      positionX: 200,
      positionY: 350,
      targetFlowerX: 200,
      targetFlowerY: 350,
      bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      sitOffsetX: 0,
      sitOffsetY: 0,
      sitTargetOffsetX: 10,
      sitTargetOffsetY: 0,
      sitActionTimer: 0,
      stateTimer: 10,
      legVisibility: 0,
    });
    const fadeInDurationSec = ROAMER_BUTTERFLY_LEG_VISIBILITY_FADE_IN_MS / 1000;
    const ctx = makeContext({ dt: fadeInDurationSec / 2 });
    const next = stepFlightStateMachine(state, ctx);

    expect(next.legVisibility).toBeGreaterThan(0);
    expect(next.legVisibility).toBeLessThan(1);
  });

  it('legVisibility reaches 1 after full fade-in duration', () => {
    const state = makeState({
      flightState: FlightState.SITTING,
      positionX: 200,
      positionY: 350,
      targetFlowerX: 200,
      targetFlowerY: 350,
      bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      sitOffsetX: 0,
      sitOffsetY: 0,
      sitTargetOffsetX: 10,
      sitTargetOffsetY: 0,
      sitActionTimer: 0,
      stateTimer: 10,
      legVisibility: 0,
    });
    const fadeInDurationSec = ROAMER_BUTTERFLY_LEG_VISIBILITY_FADE_IN_MS / 1000;
    const ctx = makeContext({ dt: fadeInDurationSec * 1.5 });
    const next = stepFlightStateMachine(state, ctx);

    expect(next.legVisibility).toBeCloseTo(1, 4);
  });

  it('legVisibility fades out on LIFTING_OFF', () => {
    const state = makeState({
      flightState: FlightState.LIFTING_OFF,
      positionX: 200,
      positionY: 350,
      bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      stateTimer: 0.5,
      targetFlowerIndex: 0,
      legVisibility: 1,
    });
    const fadeOutDurationSec = ROAMER_BUTTERFLY_LEG_VISIBILITY_FADE_OUT_MS / 1000;
    const ctx = makeContext({ dt: fadeOutDurationSec / 2 });
    const next = stepFlightStateMachine(state, ctx);

    expect(next.legVisibility).toBeGreaterThan(0);
    expect(next.legVisibility).toBeLessThan(1);
  });

  it('legVisibility reaches 0 after full fade-out in LIFTING_OFF', () => {
    const state = makeState({
      flightState: FlightState.LIFTING_OFF,
      positionX: 200,
      positionY: 350,
      bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      stateTimer: 1.0,
      targetFlowerIndex: 0,
      legVisibility: 1,
    });
    const fadeOutDurationSec = ROAMER_BUTTERFLY_LEG_VISIBILITY_FADE_OUT_MS / 1000;
    const ctx = makeContext({ dt: fadeOutDurationSec * 1.5 });
    const next = stepFlightStateMachine(state, ctx);

    expect(next.legVisibility).toBeCloseTo(0, 4);
  });

  it('legVisibility is 0 in FLYING_CRUISE', () => {
    const state = makeState({
      flightState: FlightState.FLYING_CRUISE,
      legVisibility: 0.5,
      stateTimer: 10,
    });
    const ctx = makeContext({ dt: 0.1 });
    const next = stepFlightStateMachine(state, ctx);

    expect(next.legVisibility).toBe(0);
  });

  it('legVisibility is 0 in FLYING_IDLE', () => {
    const state = makeState({
      flightState: FlightState.FLYING_IDLE,
      legVisibility: 0.5,
      stateTimer: 1,
    });
    const ctx = makeContext({ dt: 0.1 });
    const next = stepFlightStateMachine(state, ctx);

    expect(next.legVisibility).toBe(0);
  });

  it('legVisibility is 0 in APPROACH_FLOWER', () => {
    const state = makeState({
      flightState: FlightState.APPROACH_FLOWER,
      positionX: 100,
      positionY: 100,
      targetFlowerIndex: 1,
      targetFlowerX: 400,
      targetFlowerY: 250,
      legVisibility: 0.5,
    });
    const ctx = makeContext({ dt: 0.1 });
    const next = stepFlightStateMachine(state, ctx);

    expect(next.legVisibility).toBe(0);
  });
});

describe('tripod-gait phase offsets', () => {
  it('FL offset is PI apart from FR offset (mod 2*PI)', () => {
    const TWO_PI = Math.PI * 2;
    const diff = Math.abs(
      (ROAMER_BUTTERFLY_LEG_TRIPOD_OFFSETS[1]! - ROAMER_BUTTERFLY_LEG_TRIPOD_OFFSETS[0]!) % TWO_PI,
    );
    expect(diff).toBeCloseTo(Math.PI, 5);
  });

  it('ML offset is PI apart from MR offset (mod 2*PI)', () => {
    const TWO_PI = Math.PI * 2;
    const diff = Math.abs(
      (ROAMER_BUTTERFLY_LEG_TRIPOD_OFFSETS[3]! - ROAMER_BUTTERFLY_LEG_TRIPOD_OFFSETS[2]!) % TWO_PI,
    );
    expect(diff).toBeCloseTo(Math.PI, 5);
  });

  it('BL offset is PI apart from BR offset (mod 2*PI)', () => {
    const TWO_PI = Math.PI * 2;
    const diff = Math.abs(
      (ROAMER_BUTTERFLY_LEG_TRIPOD_OFFSETS[5]! - ROAMER_BUTTERFLY_LEG_TRIPOD_OFFSETS[4]!) % TWO_PI,
    );
    expect(diff).toBeCloseTo(Math.PI, 5);
  });

  it('has exactly 6 leg offsets', () => {
    expect(ROAMER_BUTTERFLY_LEG_TRIPOD_OFFSETS).toHaveLength(6);
  });

  it('spawn leg phase offsets enforce tripod pattern (FL+PI=FR mod 2*PI)', () => {
    const TWO_PI = Math.PI * 2;
    const { createRandomVisualSpawn } = require('../simulation/createButterflySpawns');
    const { createRng } = require('../../../scenery/BushShaderLayer/helpers/seededRandom');
    const rng = createRng(42);
    const spawn = createRandomVisualSpawn(rng);
    const diff = Math.abs(
      (spawn.legPhaseOffsets[1]! - spawn.legPhaseOffsets[0]!) % TWO_PI,
    );
    expect(diff).toBeCloseTo(Math.PI, 5);
  });
});
