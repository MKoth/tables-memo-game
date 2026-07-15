import {
  JELLYFISH_SPEED,
  JELLYFISH_STATE_IDLE,
  JELLYFISH_STATE_SWIMMING,
  type JellyfishState,
  type KeepOutDisk,
  type Zone,
  pickRoamingTarget,
  stepJellyfish,
} from '../jellyfishRoaming';

function makeZone(x = 0, y = 0, w = 390, h = 844): Zone {
  return { x, y, w, h };
}

function makeState(overrides: Partial<JellyfishState> = {}): JellyfishState {
  return {
    x: 200,
    y: 400,
    targetX: 300,
    targetY: 500,
    heading: 0,
    state: JELLYFISH_STATE_SWIMMING,
    stateTimer: 10,
    ...overrides,
  };
}

function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

const rng = () => 0.5;

describe('pickRoamingTarget', () => {
  const zone = makeZone();

  it('returns a point inside the zone', () => {
    const target = pickRoamingTarget(zone, null, Math.random);
    expect(target.x).toBeGreaterThanOrEqual(40);
    expect(target.x).toBeLessThanOrEqual(350);
    expect(target.y).toBeGreaterThanOrEqual(40);
    expect(target.y).toBeLessThanOrEqual(804);
  });

  it('returns the same point for deterministic RNG', () => {
    const target = pickRoamingTarget(zone, null, rng);
    expect(target.x).toBeGreaterThanOrEqual(40);
    expect(target.x).toBeLessThanOrEqual(350);
  });

  it('rejects points inside the keep-out disk', () => {
    const disk: KeepOutDisk = { centerX: 200, centerY: 400, radius: 80 };
    const seq = sequenceRng([0.5, 0.5, 0.5, 0.5, 0.8, 0.7]);
    const target = pickRoamingTarget(zone, disk, seq);
    const dist = Math.hypot(
      target.x - disk.centerX,
      target.y - disk.centerY,
    );
    expect(dist).toBeGreaterThanOrEqual(disk.radius + 20);
  });

  it('returns a point when keep-out disk is null', () => {
    const target = pickRoamingTarget(zone, null, rng);
    expect(target.x).toBeGreaterThanOrEqual(40);
    expect(target.y).toBeGreaterThanOrEqual(40);
  });

  it('returns points within the full zone area over many calls', () => {
    for (let i = 0; i < 50; i++) {
      const target = pickRoamingTarget(zone, null, Math.random);
      expect(target.x).toBeGreaterThanOrEqual(40);
      expect(target.x).toBeLessThanOrEqual(350);
      expect(target.y).toBeGreaterThanOrEqual(40);
      expect(target.y).toBeLessThanOrEqual(804);
    }
  });
});

describe('stepJellyfish', () => {
  const zone = makeZone();

  it('moves toward target', () => {
    const state = makeState({ x: 200, y: 400, targetX: 300, targetY: 500 });
    const dt = 0.1;
    const next = stepJellyfish(state, dt, JELLYFISH_SPEED, zone, null, [state], 0, rng);
    expect(next.x).toBeGreaterThan(state.x);
    expect(next.y).toBeGreaterThan(state.y);
    expect(Math.hypot(next.x - 200, next.y - 400)).toBeCloseTo(
      JELLYFISH_SPEED * dt,
      -1,
    );
  });

  it('arrives and repicks target when within threshold', () => {
    const state = makeState({
      x: 298,
      y: 498,
      targetX: 300,
      targetY: 500,
    });
    const dt = 0.1;
    const next = stepJellyfish(state, dt, JELLYFISH_SPEED, zone, null, [state], 0, rng);
    expect(next.targetX).not.toBe(state.targetX);
    expect(next.targetY).not.toBe(state.targetY);
  });

  it('clamps position to zone bounds', () => {
    const zone2 = makeZone(0, 0, 390, 200);
    const state = makeState({
      x: 150,
      y: 180,
      targetX: 200,
      targetY: 350,
      heading: Math.PI / 2,
    });
    const dt = 0.3;
    const next = stepJellyfish(state, dt, JELLYFISH_SPEED, zone2, null, [state], 0, rng);
    expect(next.y).toBeLessThanOrEqual(zone2.y + zone2.h - 40);
  });

  it('repicks target if it goes out of bounds after zone shrink', () => {
    const zone2 = makeZone(0, 0, 200, 200);
    const state = makeState({
      x: 100,
      y: 100,
      targetX: 350,
      targetY: 500,
    });
    const dt = 0.1;
    const next = stepJellyfish(state, dt, JELLYFISH_SPEED, zone2, null, [state], 0, rng);
    const minX = zone2.x + 40;
    const maxX = zone2.x + zone2.w - 40;
    const minY = zone2.y + 40;
    const maxY = zone2.y + zone2.h - 40;
    expect(next.targetX).toBeGreaterThanOrEqual(minX);
    expect(next.targetX).toBeLessThanOrEqual(maxX);
    expect(next.targetY).toBeGreaterThanOrEqual(minY);
    expect(next.targetY).toBeLessThanOrEqual(maxY);
  });

  it('sets heading based on actual movement direction', () => {
    const state = makeState({
      x: 200,
      y: 400,
      targetX: 400,
      targetY: 400,
      heading: 0,
    });
    const dt = 0.1;
    const next = stepJellyfish(state, dt, JELLYFISH_SPEED, zone, null, [state], 0, rng);
    expect(next.heading).toBeGreaterThan(-0.1);
    expect(next.heading).toBeLessThan(0.1);
  });

  it('applies separation between two jellyfish', () => {
    const jellyA = makeState({ x: 200, y: 400, heading: 0 });
    const jellyB = makeState({ x: 210, y: 400, heading: Math.PI });
    const dt = 0.1;
    const nextA = stepJellyfish(
      jellyA,
      dt,
      JELLYFISH_SPEED,
      zone,
      null,
      [jellyA, jellyB],
      0,
      rng,
    );
    const nextB = stepJellyfish(
      jellyB,
      dt,
      JELLYFISH_SPEED,
      zone,
      null,
      [jellyA, jellyB],
      1,
      rng,
    );
    expect(nextA.x).toBeLessThan(201);
    expect(nextB.x).toBeGreaterThan(209);
  });

  it('stays in place and preserves heading when idle', () => {
    const state = makeState({
      state: JELLYFISH_STATE_IDLE,
      stateTimer: 5,
      heading: 1.5,
    });
    const dt = 0.1;
    const next = stepJellyfish(state, dt, JELLYFISH_SPEED, zone, null, [state], 0, rng);
    expect(next.x).toBe(200);
    expect(next.y).toBe(400);
    expect(next.heading).toBe(1.5);
    expect(next.state).toBe(JELLYFISH_STATE_IDLE);
  });

  it('transitions from idle to swimming when timer expires', () => {
    const state = makeState({ state: JELLYFISH_STATE_IDLE, stateTimer: 0.05 });
    const dt = 0.1;
    const next = stepJellyfish(state, dt, JELLYFISH_SPEED, zone, null, [state], 0, rng);
    expect(next.state).toBe(JELLYFISH_STATE_SWIMMING);
  });
});
