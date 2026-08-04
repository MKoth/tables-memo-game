const mockSharedValues: Array<{ value: number }> = [];

jest.mock('react-native-reanimated', () => {
  const Easing = {
    linear: (t: number) => t,
    cubic: (t: number) => t,
    inOut: () => (t: number) => t,
    out: () => (t: number) => t,
  };
  return {
    ReduceMotion: { System: -1, Always: 0, Never: 1 },
    useDerivedValue: (fn: () => unknown) => ({
      get value() {
        return fn();
      },
    }),
    useSharedValue: (initial: number) => {
      const sv = { value: initial };
      mockSharedValues.push(sv);
      return sv;
    },
    withTiming: jest.fn(
      (value: number, _config?: unknown, finished?: (ok: boolean) => void) => {
        if (finished) {
          finished(true);
        }
        return value;
      },
    ),
    withDelay: (_delayMs: number, animation: unknown) => animation,
    cancelAnimation: jest.fn(),
    Easing,
    useFrameCallback: jest.fn(),
  };
});

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: () => void) => fn(),
}));

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { SharedValue } from 'react-native-reanimated';
import { createRng } from '../../scenery/BushShaderLayer/helpers/seededRandom';
import { generateOrbPetalConfigs } from '../generateOrbPetalConfigs';
import {
  ORB_IDLE_CLOCK_SPAN_MS,
  ORB_RING_CONFIGS,
} from '../orbAnimPresets';
import {
  OrbPhase,
  type BurstIntentValue,
  type OrbAnimationConfig,
  type PetalRingConfig,
  type PetalSpawnConfig,
} from '../orbAnimTypes';
import {
  useOrbAnimation,
  startOrbIdleClock,
  currentIdleElapsedMs,
} from '../useOrbAnimation';
import { computeOrbAnimState } from '../orbAnimWorklets';

const CONFIG: OrbAnimationConfig = {
  originX: 100,
  originY: 100,
  targetCenterX: 400,
  targetCenterY: 300,
  targetDiameter: 300,
};

const mockWithTiming = require('react-native-reanimated').withTiming as jest.Mock;
const mockCancelAnimation = require('react-native-reanimated').cancelAnimation as jest.Mock;
const mockUseFrameCallback = require('react-native-reanimated').useFrameCallback as jest.Mock;
const mockReduceMotion = require('react-native-reanimated').ReduceMotion as {
  System: number;
  Always: number;
  Never: number;
};

type Captured = {
  anim: { value: unknown };
  phase: { value: number };
  startBurst: (intent?: BurstIntentValue) => void;
};

function makeClock(initial: number): SharedValue<number> {
  return { value: initial } as unknown as SharedValue<number>;
}

let lastResult: Captured | null = null;
let lastError: unknown = null;

function HookHost({
  config,
  rings,
  petals,
  onDismiss,
  enabled,
  idleClock,
}: {
  config: OrbAnimationConfig;
  rings: ReadonlyArray<PetalRingConfig>;
  petals: ReadonlyArray<PetalSpawnConfig>;
  onDismiss: () => void;
  enabled: boolean;
  idleClock?: SharedValue<number>;
}) {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    lastResult = useOrbAnimation(
      config,
      rings,
      petals,
      onDismiss,
      enabled,
      undefined,
      undefined,
      idleClock,
    );
  } catch (e) {
    lastError = e;
  }
  return null;
}

function makePetals(seed = 1): PetalSpawnConfig[] {
  return generateOrbPetalConfigs({ rng: createRng(seed) });
}

function mount(
  config: OrbAnimationConfig,
  enabled: boolean,
  petals: PetalSpawnConfig[] = makePetals(),
  idleClock?: SharedValue<number>,
) {
  const onDismiss = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <HookHost
        config={config}
        rings={ORB_RING_CONFIGS}
        petals={petals}
        onDismiss={onDismiss}
        enabled={enabled}
        idleClock={idleClock}
      />,
    );
  });
  if (lastError) {
    throw lastError;
  }
  return {
    onDismiss,
    unmount: () => {
      ReactTestRenderer.act(() => {
        renderer!.unmount();
      });
    },
  };
}

function idleClockValueCount(): number {
  return mockSharedValues.filter(sv => sv.value === ORB_IDLE_CLOCK_SPAN_MS).length;
}

function expectIdleClockStarted(): void {
  expect(mockWithTiming).toHaveBeenCalledWith(
    ORB_IDLE_CLOCK_SPAN_MS,
    expect.objectContaining({
      duration: ORB_IDLE_CLOCK_SPAN_MS,
      easing: expect.any(Function),
      reduceMotion: mockReduceMotion.Never,
    }),
  );
}

describe('startOrbIdleClock', () => {
  it('resets then starts a linear ramp spanning the full clock span', () => {
    const sv = { value: 42 } as unknown as SharedValue<number>;
    startOrbIdleClock(sv);
    expect(sv.value).toBe(ORB_IDLE_CLOCK_SPAN_MS);
    const call = mockWithTiming.mock.calls.find(
      (args: unknown[]) => args[0] === ORB_IDLE_CLOCK_SPAN_MS,
    );
    expect(call).toBeDefined();
    const config = call![1] as {
      duration: number;
      easing: (t: number) => number;
      reduceMotion: number;
    };
    expect(config.duration).toBe(ORB_IDLE_CLOCK_SPAN_MS);
    expect(config.easing(0.3)).toBeCloseTo(0.3);
    expect(config.reduceMotion).toBe(mockReduceMotion.Never);
  });
});

describe('useOrbAnimation idle clock', () => {
  beforeEach(() => {
    lastResult = null;
    lastError = null;
    mockSharedValues.length = 0;
    mockWithTiming.mockClear();
    mockCancelAnimation.mockClear();
    mockUseFrameCallback.mockClear();
  });

  it('runs no always-on frame callback', () => {
    mount({ ...CONFIG, skipEnter: true }, true);
    expect(mockUseFrameCallback).not.toHaveBeenCalled();
  });

  it('starts the idle clock when entering Idle via skipEnter', () => {
    mount({ ...CONFIG, skipEnter: true }, true);
    expect(lastResult!.phase.value).toBe(OrbPhase.Idle);
    expectIdleClockStarted();
    expect(idleClockValueCount()).toBe(1);
  });

  it('starts the idle clock when the enter tween completes', () => {
    mount(CONFIG, true);
    expect(lastResult!.phase.value).toBe(OrbPhase.Idle);
    expectIdleClockStarted();
    expect(idleClockValueCount()).toBe(1);
  });

  it('leaves the idle clock stopped while disabled', () => {
    mount(CONFIG, false);
    expect(lastResult!.phase.value).toBe(OrbPhase.None);
    expect(idleClockValueCount()).toBe(0);
  });

  it('freezes the elapsed idle time when the burst starts', () => {
    const { onDismiss } = mount({ ...CONFIG, skipEnter: true }, true);
    expect(idleClockValueCount()).toBe(1);
    const idleClock = mockSharedValues.find(
      sv => sv.value === ORB_IDLE_CLOCK_SPAN_MS,
    )!;
    idleClock.value = 12345;
    const cancelsBefore = mockCancelAnimation.mock.calls.length;
    ReactTestRenderer.act(() => {
      lastResult!.startBurst();
    });
    expect(lastResult!.phase.value).toBe(OrbPhase.Burst);
    expect(mockSharedValues.filter(sv => sv.value === 12345)).toHaveLength(2);
    expect(mockCancelAnimation.mock.calls.length).toBeGreaterThan(cancelsBefore);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('cancels the idle clock on unmount', () => {
    const { unmount } = mount({ ...CONFIG, skipEnter: true }, true);
    const cancelsBefore = mockCancelAnimation.mock.calls.length;
    unmount();
    expect(mockCancelAnimation.mock.calls.length).toBeGreaterThan(cancelsBefore);
  });
});

describe('useOrbAnimation quantized idle clock', () => {
  beforeEach(() => {
    lastResult = null;
    lastError = null;
    mockSharedValues.length = 0;
    mockWithTiming.mockClear();
    mockCancelAnimation.mockClear();
    mockUseFrameCallback.mockClear();
  });

  function petalAngle(state: { petals: Array<{ x: number; y: number }> }, index: number) {
    const p = state.petals[index]!;
    return Math.atan2(p.y - CONFIG.targetCenterY, p.x - CONFIG.targetCenterX);
  }

  it('drives idle motion from the clock instead of the continuous timing ramp', () => {
    mount({ ...CONFIG, skipEnter: true }, true, makePetals(), makeClock(0));
    expect(lastResult!.phase.value).toBe(OrbPhase.Idle);
    expect(idleClockValueCount()).toBe(0);
  });

  it('advances idle ring rotation by the clock delta since idle start', () => {
    const idleClock = makeClock(0);
    mount({ ...CONFIG, skipEnter: true }, true, makePetals(7), idleClock);
    const t0 = lastResult!.anim.value as { petals: Array<{ x: number; y: number }> };
    idleClock.value = 1000;
    const t1 = lastResult!.anim.value as { petals: Array<{ x: number; y: number }> };
    const ring = ORB_RING_CONFIGS[0]!;
    const expectedDelta = ring.rotationSpeed * ring.direction * 1.0;
    const petals = makePetals(7);
    for (let i = 0; i < petals.length; i++) {
      if (petals[i]!.ringIndex !== 0) {
        continue;
      }
      const a0 = petalAngle(t0, i);
      const a1 = petalAngle(t1, i);
      const diff = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
      expect(diff).toBeCloseTo(expectedDelta, 4);
    }
  });

  it('captures the clock at idle start so petals hold the enter-final position', () => {
    const idleClock = makeClock(5000);
    mount({ ...CONFIG, skipEnter: true }, true, makePetals(), idleClock);
    const state = lastResult!.anim.value as { petals: Array<{ x: number; y: number }> };
    const petals = makePetals();
    for (let i = 0; i < state.petals.length; i++) {
      const ring = ORB_RING_CONFIGS[petals[i]!.ringIndex]!;
      const expected = petals[i]!.initialAngle + ring.phaseOffset;
      const diff = Math.atan2(
        Math.sin(petalAngle(state, i) - expected),
        Math.cos(petalAngle(state, i) - expected),
      );
      expect(diff).toBeCloseTo(0, 4);
    }
  });

  it('captures the clock when the enter tween completes', () => {
    const idleClock = makeClock(2500);
    mount(CONFIG, true, makePetals(9), idleClock);
    expect(lastResult!.phase.value).toBe(OrbPhase.Idle);
    const state = lastResult!.anim.value as { petals: Array<{ x: number; y: number }> };
    const petals = makePetals(9);
    for (let i = 0; i < state.petals.length; i++) {
      const ring = ORB_RING_CONFIGS[petals[i]!.ringIndex]!;
      const expected = petals[i]!.initialAngle + ring.phaseOffset;
      const diff = Math.atan2(
        Math.sin(petalAngle(state, i) - expected),
        Math.cos(petalAngle(state, i) - expected),
      );
      expect(diff).toBeCloseTo(0, 4);
    }
  });

  it('freezes zero idle elapsed when the burst starts during enter', () => {
    const idleClock = makeClock(5000);
    const clockStart = makeClock(0);
    const fallback = makeClock(0);
    expect(
      currentIdleElapsedMs(OrbPhase.Enter, idleClock, clockStart, fallback),
    ).toBe(0);
    expect(
      currentIdleElapsedMs(OrbPhase.None, idleClock, clockStart, fallback),
    ).toBe(0);
  });

  it('freezes the clock delta while idle and the fallback ramp without a clock', () => {
    const idleClock = makeClock(7000);
    const clockStart = makeClock(2000);
    const fallback = makeClock(1234);
    expect(
      currentIdleElapsedMs(OrbPhase.Idle, idleClock, clockStart, fallback),
    ).toBe(5000);
    expect(
      currentIdleElapsedMs(OrbPhase.Idle, undefined, clockStart, fallback),
    ).toBe(1234);
  });

  it('freezes the idle clock delta when the burst starts', () => {
    const idleClock = makeClock(0);
    const petals = makePetals(17);
    mount({ ...CONFIG, skipEnter: true }, true, petals, idleClock);
    idleClock.value = 2000;
    ReactTestRenderer.act(() => {
      lastResult!.startBurst();
    });
    expect(lastResult!.phase.value).toBe(OrbPhase.Burst);
    const frozenBurst = lastResult!.anim.value as { petals: Array<{ x: number; y: number }> };
    idleClock.value = 9000;
    const afterClockAdvance = lastResult!.anim.value as {
      petals: Array<{ x: number; y: number }>;
    };
    const expected = computeOrbAnimState(
      OrbPhase.Burst,
      1,
      1,
      2000,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    for (let i = 0; i < frozenBurst.petals.length; i++) {
      expect(frozenBurst.petals[i]!.x).toBeCloseTo(expected.petals[i]!.x, 1);
      expect(frozenBurst.petals[i]!.y).toBeCloseTo(expected.petals[i]!.y, 1);
      expect(afterClockAdvance.petals[i]!.x).toBeCloseTo(frozenBurst.petals[i]!.x, 1);
      expect(afterClockAdvance.petals[i]!.y).toBeCloseTo(frozenBurst.petals[i]!.y, 1);
    }
  });
});
