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
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
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
import { useOrbAnimation, startOrbIdleClock } from '../useOrbAnimation';

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
  anim: unknown;
  phase: { value: number };
  startBurst: (intent?: BurstIntentValue) => void;
};

let lastResult: Captured | null = null;
let lastError: unknown = null;

function HookHost({
  config,
  rings,
  petals,
  onDismiss,
  enabled,
}: {
  config: OrbAnimationConfig;
  rings: ReadonlyArray<PetalRingConfig>;
  petals: ReadonlyArray<PetalSpawnConfig>;
  onDismiss: () => void;
  enabled: boolean;
}) {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    lastResult = useOrbAnimation(config, rings, petals, onDismiss, enabled);
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
