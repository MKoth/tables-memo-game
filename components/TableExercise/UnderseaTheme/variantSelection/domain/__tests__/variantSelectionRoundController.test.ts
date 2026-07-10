import {
  ROUND_ADVANCE_DELAY_MS,
  ROUND_HOLD_DURATION_MS,
} from '../roundResolutionTiming';
import {
  createVariantSelectionRoundController,
  type VariantSelectionRoundPhase,
} from '../variantSelectionRoundController';

function createTestController(
  roundCount: number,
  overrides: Partial<Parameters<typeof createVariantSelectionRoundController>[0]> = {},
) {
  const timers: Array<{ fn: () => void; delayMs: number }> = [];
  const scheduleTimer = (fn: () => void, delayMs: number) => {
    timers.push({ fn, delayMs });
    return () => {};
  };
  const onPhaseChange = jest.fn();
  const onSessionComplete = jest.fn();
  const controller = createVariantSelectionRoundController({
    roundCount,
    scheduleTimer,
    holdDurationMs: ROUND_HOLD_DURATION_MS,
    onPhaseChange,
    onSessionComplete,
    ...overrides,
  });
  return { controller, timers, onPhaseChange, onSessionComplete };
}

function runHoldTimer(timers: Array<{ fn: () => void; delayMs: number }>) {
  const holdTimer = timers.find(timer => timer.delayMs === ROUND_HOLD_DURATION_MS);
  expect(holdTimer).toBeDefined();
  holdTimer!.fn();
}

function runAdvanceTimer(timers: Array<{ fn: () => void; delayMs: number }>) {
  const advanceTimer = timers.find(timer => timer.delayMs === ROUND_ADVANCE_DELAY_MS);
  expect(advanceTimer).toBeDefined();
  advanceTimer!.fn();
}

describe('createVariantSelectionRoundController', () => {
  it('starts in enter on the first round', () => {
    const { controller } = createTestController(3);
    expect(controller.getSnapshot()).toEqual({
      phase: 'enter',
      roundPos: 0,
      isSessionComplete: false,
    });
  });

  it('moves from enter to transform on row enter complete', () => {
    const { controller } = createTestController(2);
    controller.notifyRowEnterComplete();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'transform',
    });
  });

  it('ignores duplicate row-enter events', () => {
    const { controller, onPhaseChange } = createTestController(2);
    controller.notifyRowEnterComplete();
    expect(controller.getSnapshot().phase).toBe('transform');
    controller.notifyRowEnterComplete();
    expect(controller.getSnapshot().phase).toBe('transform');
    expect(onPhaseChange).toHaveBeenCalledTimes(1);
  });

  it('moves from transform to resolve on correct answer', () => {
    const { controller } = createTestController(2);
    controller.notifyRowEnterComplete();
    controller.notifyCorrectAnswer();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'resolve',
    });
  });

  it('ignores correct answer when not in transform', () => {
    const { controller } = createTestController(2);
    controller.notifyCorrectAnswer();
    expect(controller.getSnapshot().phase).toBe('enter');
  });

  it('moves from resolve to hold and schedules hold timer', () => {
    const { controller, timers } = createTestController(2);
    controller.notifyRowEnterComplete();
    controller.notifyCorrectAnswer();
    controller.notifyResolveComplete();
    expect(controller.getSnapshot().phase).toBe('hold');
    const holdTimers = timers.filter(timer => timer.delayMs === ROUND_HOLD_DURATION_MS);
    expect(holdTimers).toHaveLength(1);
  });

  it('respects the injected hold duration before exit', () => {
    jest.useFakeTimers();
    const onPhaseChange = jest.fn();
    const controller = createVariantSelectionRoundController({
      roundCount: 1,
      scheduleTimer: (fn, delayMs) => {
        const id = setTimeout(fn, delayMs);
        return () => clearTimeout(id);
      },
      holdDurationMs: 1500,
      onPhaseChange,
    });
    controller.notifyRowEnterComplete();
    controller.notifyCorrectAnswer();
    controller.notifyResolveComplete();
    expect(controller.getSnapshot().phase).toBe('hold');
    jest.advanceTimersByTime(1499);
    expect(controller.getSnapshot().phase).toBe('hold');
    jest.advanceTimersByTime(1);
    expect(controller.getSnapshot().phase).toBe('exit');
    controller.dispose();
    jest.useRealTimers();
  });

  it('moves from hold to exit when hold timer fires', () => {
    const { controller, timers } = createTestController(2);
    controller.notifyRowEnterComplete();
    controller.notifyCorrectAnswer();
    controller.notifyResolveComplete();
    expect(controller.getSnapshot().phase).toBe('hold');
    runHoldTimer(timers);
    expect(controller.getSnapshot().phase).toBe('exit');
  });

  it('moves from exit to advance and schedules next round', () => {
    const { controller, timers } = createTestController(3);
    controller.notifyRowEnterComplete();
    controller.notifyCorrectAnswer();
    controller.notifyResolveComplete();
    runHoldTimer(timers);
    expect(controller.getSnapshot().phase).toBe('exit');
    controller.notifyExitComplete();
    expect(controller.getSnapshot().phase).toBe('advance');
    runAdvanceTimer(timers);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'enter',
      roundPos: 1,
      isSessionComplete: false,
    });
  });

  it('passes through the full lifecycle for one round', () => {
    const recordedPhases: VariantSelectionRoundPhase[] = [];
    const timerList: Array<{ fn: () => void; delayMs: number }> = [];
    const ctrl = createVariantSelectionRoundController({
      roundCount: 2,
      scheduleTimer: (fn, delayMs) => {
        timerList.push({ fn, delayMs });
        return () => {};
      },
      onPhaseChange: () => recordedPhases.push(ctrl.getSnapshot().phase),
    });
    ctrl.notifyRowEnterComplete();
    ctrl.notifyCorrectAnswer();
    ctrl.notifyResolveComplete();
    runHoldTimer(timerList);
    ctrl.notifyExitComplete();
    expect(recordedPhases).toContain('advance');
    expect(ctrl.getSnapshot().phase).toBe('advance');
    runAdvanceTimer(timerList);
    expect(ctrl.getSnapshot().phase).toBe('enter');
  });

  it('marks session complete after the final round exits', () => {
    const { controller, timers, onSessionComplete } = createTestController(1);
    controller.notifyRowEnterComplete();
    controller.notifyCorrectAnswer();
    controller.notifyResolveComplete();
    runHoldTimer(timers);
    controller.notifyExitComplete();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'advance',
      roundPos: 1,
      isSessionComplete: true,
    });
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate correct-answer events', () => {
    const { controller, onPhaseChange } = createTestController(2);
    controller.notifyRowEnterComplete();
    controller.notifyCorrectAnswer();
    controller.notifyCorrectAnswer();
    expect(controller.getSnapshot().phase).toBe('resolve');
    expect(onPhaseChange).toHaveBeenCalledTimes(2);
  });

  it('ignores duplicate resolve-complete events', () => {
    const { controller } = createTestController(2);
    controller.notifyRowEnterComplete();
    controller.notifyCorrectAnswer();
    controller.notifyResolveComplete();
    controller.notifyResolveComplete();
    expect(controller.getSnapshot().phase).toBe('hold');
  });

  it('ignores duplicate exit-complete events', () => {
    const { controller, timers } = createTestController(2);
    controller.notifyRowEnterComplete();
    controller.notifyCorrectAnswer();
    controller.notifyResolveComplete();
    runHoldTimer(timers);
    controller.notifyExitComplete();
    controller.notifyExitComplete();
    expect(controller.getSnapshot().phase).toBe('advance');
  });

  it('fires onPhaseChange when phase transitions', () => {
    const { controller, onPhaseChange } = createTestController(2);
    controller.notifyRowEnterComplete();
    expect(onPhaseChange).toHaveBeenCalledTimes(1);
  });

  it('fires onSessionComplete after all rounds completed', () => {
    const { controller, timers, onSessionComplete } = createTestController(1);
    controller.notifyRowEnterComplete();
    controller.notifyCorrectAnswer();
    controller.notifyResolveComplete();
    runHoldTimer(timers);
    controller.notifyExitComplete();
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
  });

  it('dispose cancels a pending hold timer', () => {
    jest.useFakeTimers();
    const controller = createVariantSelectionRoundController({
      roundCount: 1,
      scheduleTimer: (fn, delayMs) => {
        const id = setTimeout(fn, delayMs);
        return () => clearTimeout(id);
      },
      holdDurationMs: 1500,
    });
    controller.notifyRowEnterComplete();
    controller.notifyCorrectAnswer();
    controller.notifyResolveComplete();
    expect(controller.getSnapshot().phase).toBe('hold');
    controller.dispose();
    jest.advanceTimersByTime(2000);
    expect(controller.getSnapshot().phase).toBe('hold');
    jest.useRealTimers();
  });
});
