import { OrbPhase } from '../../orb/orbAnimTypes';
import {
  ORB_BURST_DURATION_MS,
  ORB_ENTER_DURATION_MS,
  ORB_SPAWN_DIAMETER_RATIO,
  ORB_WRONG_FEEDBACK_MS,
  ORB_WRONG_RAMP_MS,
  ORB_WRONG_TINT_STRENGTH,
} from '../../orb/orbAnimPresets';
import { computeOrbActorPose, computeOrbActorPoses } from '../computeOrbActorPose';
import type { OrbActorRuntime } from '../orbActorSceneTypes';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function makeRuntime(overrides: Partial<OrbActorRuntime> = {}): OrbActorRuntime {
  return {
    id: 'letter:0',
    kind: 'letter',
    char: 'a',
    phase: OrbPhase.Idle,
    visible: true,
    targetCenterX: 100,
    targetCenterY: 200,
    targetDiameter: 50,
    move: null,
    enterStartMs: 0,
    enterDelayMs: null,
    enterOriginX: 100,
    enterOriginY: 200,
    burstStartMs: 0,
    popDelayMs: null,
    idleStartMs: 10_000,
    wrongStartMs: -1,
    popped: false,
    skipEnter: false,
    ...overrides,
  };
}

describe('computeOrbActorPose', () => {
  it('renders a None-phase runtime invisible with zero diameter', () => {
    const pose = computeOrbActorPose(makeRuntime({ phase: OrbPhase.None }), 10_000);

    expect(pose.phase).toBe(OrbPhase.None);
    expect(pose.diameter).toBe(0);
    expect(pose.overallOpacity).toBe(0);
  });

  it('holds an idle orb at its target with the idle clock running', () => {
    const pose = computeOrbActorPose(makeRuntime(), 12_500);

    expect(pose.phase).toBe(OrbPhase.Idle);
    expect(pose.centerX).toBe(100);
    expect(pose.centerY).toBe(200);
    expect(pose.diameter).toBe(50);
    expect(pose.overallOpacity).toBe(1);
    expect(pose.captureVisualT).toBe(1);
    expect(pose.enterT).toBe(1);
    expect(pose.idleElapsedMs).toBe(2_500);
  });

  it('eases the enter spiral from the spawn diameter', () => {
    const runtime = makeRuntime({
      phase: OrbPhase.Enter,
      enterStartMs: 10_000,
      enterDelayMs: 0,
      idleStartMs: 10_000 + ORB_ENTER_DURATION_MS,
    });
    const atHalf = computeOrbActorPose(runtime, 10_000 + ORB_ENTER_DURATION_MS * 0.5);

    const t = easeOutCubic(0.5);
    expect(atHalf.enterT).toBeCloseTo(t);
    expect(atHalf.overallOpacity).toBeCloseTo(t);
    expect(atHalf.diameter).toBeCloseTo(
      50 * ORB_SPAWN_DIAMETER_RATIO + (50 - 50 * ORB_SPAWN_DIAMETER_RATIO) * t,
    );

    const after = computeOrbActorPose(runtime, 10_000 + ORB_ENTER_DURATION_MS + 100);
    expect(after.enterT).toBe(1);
  });

  it('renders a completed enter as idle with the idle clock running', () => {
    const runtime = makeRuntime({
      phase: OrbPhase.Enter,
      enterStartMs: 10_000,
      enterDelayMs: 0,
      idleStartMs: 10_000 + ORB_ENTER_DURATION_MS,
    });

    const pose = computeOrbActorPose(runtime, 12_500);

    expect(pose.enterT).toBe(1);
    expect(pose.overallOpacity).toBe(1);
    expect(pose.idleElapsedMs).toBeCloseTo(2_000);
  });

  it('delays the enter by enterDelayMs', () => {
    const runtime = makeRuntime({
      phase: OrbPhase.Enter,
      enterStartMs: 10_000,
      enterDelayMs: 300,
      idleStartMs: 10_300 + ORB_ENTER_DURATION_MS,
    });

    const before = computeOrbActorPose(runtime, 10_200);
    expect(before.enterT).toBe(0);

    const after = computeOrbActorPose(runtime, 10_300 + ORB_ENTER_DURATION_MS * 0.25);
    expect(after.enterT).toBeCloseTo(easeOutCubic(0.25));
  });

  it('freezes the idle clock at the burst start', () => {
    const runtime = makeRuntime({
      phase: OrbPhase.Burst,
      burstStartMs: 20_000,
      popDelayMs: 0,
      idleStartMs: 10_000,
    });

    const burst = computeOrbActorPose(runtime, 20_000 + ORB_BURST_DURATION_MS * 0.5);

    expect(burst.phase).toBe(OrbPhase.Burst);
    expect(burst.burstT).toBeCloseTo(easeOutCubic(0.5));
    expect(burst.idleElapsedMs).toBe(10_000);
  });

  it('fades the burst out after the eased progress crosses the petal-fade window', () => {
    const runtime = makeRuntime({
      phase: OrbPhase.Burst,
      burstStartMs: 20_000,
      popDelayMs: 0,
      idleStartMs: 10_000,
    });

    const early = computeOrbActorPose(runtime, 20_000 + 40);
    expect(early.overallOpacity).toBe(1);

    const mid = computeOrbActorPose(runtime, 20_000 + ORB_BURST_DURATION_MS * 0.5);
    const easedMid = easeOutCubic(0.5);
    expect(mid.overallOpacity).toBeCloseTo(1 - (easedMid - 0.5) / 0.5);

    const end = computeOrbActorPose(runtime, 20_000 + ORB_BURST_DURATION_MS);
    expect(end.overallOpacity).toBe(0);
    expect(end.captureVisualT).toBe(0);
  });

  it('shakes and tints the orb while wrong with the timed envelope', () => {
    const runtime = makeRuntime({ wrongStartMs: 10_000 });

    const duringRamp = computeOrbActorPose(runtime, 10_000 + ORB_WRONG_RAMP_MS * 0.5);
    expect(duringRamp.tintStrength).toBeCloseTo(
      easeOutCubic(0.5) * ORB_WRONG_TINT_STRENGTH,
    );
    expect(duringRamp.tintR).toBe(1);
    expect(duringRamp.tintG).toBe(0.35);
    expect(duringRamp.tintB).toBe(0.35);
    expect(duringRamp.centerX).not.toBe(100);

    const midHold = computeOrbActorPose(runtime, 10_000 + ORB_WRONG_RAMP_MS + 100);
    expect(midHold.tintStrength).toBeCloseTo(ORB_WRONG_TINT_STRENGTH);

    const done = computeOrbActorPose(runtime, 10_000 + ORB_WRONG_FEEDBACK_MS + 50);
    expect(done.tintStrength).toBe(0);
    expect(done.centerX).toBe(100);
  });

  it('ramps the shake amplitude with the wrong progress', () => {
    const runtime = makeRuntime({ wrongStartMs: 10_000 });
    const peak = computeOrbActorPose(runtime, 10_000 + ORB_WRONG_RAMP_MS);

    const maxAmp = Math.max(2, 50 * 0.05);
    const dx = Math.abs(peak.centerX - 100);
    const dy = Math.abs(peak.centerY - 200);
    expect(dx).toBeLessThanOrEqual(maxAmp + 1e-9);
    expect(dy).toBeLessThanOrEqual(maxAmp + 1e-9);
    expect(dx + dy).toBeGreaterThan(0);
  });

  it('tweens the move tween with ease-in-out cubic', () => {
    const runtime = makeRuntime({
      targetCenterX: 150,
      move: {
        fromX: 100,
        fromY: 200,
        fromDiameter: 50,
        startMs: 10_000,
        durationMs: 320,
      },
    });

    const atHalf = computeOrbActorPose(runtime, 10_160);
    const t = easeInOutCubic(0.5);
    expect(atHalf.centerX).toBeCloseTo(100 + 50 * t);
    expect(atHalf.centerY).toBeCloseTo(200);

    const done = computeOrbActorPose(runtime, 10_320);
    expect(done.centerX).toBe(150);
  });

  it('snaps an inactive move to the target', () => {
    const runtime = makeRuntime({
      targetCenterX: 150,
      move: {
        fromX: 100,
        fromY: 200,
        fromDiameter: 50,
        startMs: 10_000,
        durationMs: 0,
      },
    });

    const pose = computeOrbActorPose(runtime, 10_100);
    expect(pose.centerX).toBe(150);
  });

  it('forces opacity to zero when the runtime is not visible', () => {
    const pose = computeOrbActorPose(makeRuntime({ visible: false }), 10_000);
    expect(pose.overallOpacity).toBe(0);
  });

  it('computes every slot in one pass', () => {
    const runtimes = [makeRuntime(), makeRuntime({ phase: OrbPhase.None })];

    const poses = computeOrbActorPoses(runtimes, 12_500);

    expect(poses).toHaveLength(2);
    expect(poses[0]!.diameter).toBe(50);
    expect(poses[1]!.diameter).toBe(0);
  });
});
