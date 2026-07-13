import { ROUND_ADVANCE_DELAY_MS } from '../roundResolutionTiming';
import {
  createTranslationSpellingRoundController,
  type TranslationSpellingRoundPhase,
} from '../translationSpellingRoundController';

function createTestController(
  roundCount: number,
  overrides: Partial<Parameters<typeof createTranslationSpellingRoundController>[0]> = {},
) {
  const timers: Array<{ fn: () => void; delayMs: number }> = [];
  const scheduleTimer = (fn: () => void, delayMs: number) => {
    timers.push({ fn, delayMs });
    return () => {};
  };
  const onPhaseChange = jest.fn();
  const onSessionComplete = jest.fn();
  const controller = createTranslationSpellingRoundController({
    roundCount,
    scheduleTimer,
    onPhaseChange,
    onSessionComplete,
    ...overrides,
  });
  return { controller, timers, onPhaseChange, onSessionComplete };
}

function runAdvanceTimer(timers: Array<{ fn: () => void; delayMs: number }>) {
  const advanceTimer = timers.find(timer => timer.delayMs === ROUND_ADVANCE_DELAY_MS);
  expect(advanceTimer).toBeDefined();
  advanceTimer!.fn();
}

describe('createTranslationSpellingRoundController', () => {
  it('starts in enter on the first round', () => {
    const { controller } = createTestController(3);
    expect(controller.getSnapshot()).toEqual({
      phase: 'enter',
      roundPos: 0,
      isSessionComplete: false,
    });
  });

  it('moves from enter to transform on enter complete', () => {
    const { controller } = createTestController(2);
    controller.notifyEnterComplete();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'transform',
    });
  });

  it('ignores duplicate enter-complete events', () => {
    const { controller, onPhaseChange } = createTestController(2);
    controller.notifyEnterComplete();
    expect(controller.getSnapshot().phase).toBe('transform');
    controller.notifyEnterComplete();
    expect(controller.getSnapshot().phase).toBe('transform');
    expect(onPhaseChange).toHaveBeenCalledTimes(1);
  });

  it('moves from transform to resolve on word complete', () => {
    const { controller } = createTestController(2);
    controller.notifyEnterComplete();
    controller.notifyWordComplete();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'resolve',
    });
  });

  it('ignores word complete when not in transform', () => {
    const { controller } = createTestController(2);
    controller.notifyWordComplete();
    expect(controller.getSnapshot().phase).toBe('enter');
  });

  it('moves from resolve to exit on resolve complete', () => {
    const { controller } = createTestController(2);
    controller.notifyEnterComplete();
    controller.notifyWordComplete();
    controller.notifyResolveComplete();
    expect(controller.getSnapshot().phase).toBe('exit');
  });

  it('ignores duplicate resolve-complete events', () => {
    const { controller } = createTestController(2);
    controller.notifyEnterComplete();
    controller.notifyWordComplete();
    controller.notifyResolveComplete();
    expect(controller.getSnapshot().phase).toBe('exit');
    controller.notifyResolveComplete();
    expect(controller.getSnapshot().phase).toBe('exit');
  });

  it('moves from exit to advance and schedules next round', () => {
    const { controller, timers } = createTestController(3);
    controller.notifyEnterComplete();
    controller.notifyWordComplete();
    controller.notifyResolveComplete();
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
    const recordedPhases: TranslationSpellingRoundPhase[] = [];
    const timerList: Array<{ fn: () => void; delayMs: number }> = [];
    const ctrl = createTranslationSpellingRoundController({
      roundCount: 2,
      scheduleTimer: (fn, delayMs) => {
        timerList.push({ fn, delayMs });
        return () => {};
      },
      onPhaseChange: () => recordedPhases.push(ctrl.getSnapshot().phase),
    });
    ctrl.notifyEnterComplete();
    ctrl.notifyWordComplete();
    ctrl.notifyResolveComplete();
    ctrl.notifyExitComplete();
    expect(recordedPhases).toContain('advance');
    expect(ctrl.getSnapshot().phase).toBe('advance');
    runAdvanceTimer(timerList);
    expect(ctrl.getSnapshot().phase).toBe('enter');
  });

  it('marks session complete after the final round exits', () => {
    const { controller, onSessionComplete } = createTestController(1);
    controller.notifyEnterComplete();
    controller.notifyWordComplete();
    controller.notifyResolveComplete();
    controller.notifyExitComplete();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'advance',
      roundPos: 1,
      isSessionComplete: true,
    });
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate exit-complete events', () => {
    const { controller } = createTestController(2);
    controller.notifyEnterComplete();
    controller.notifyWordComplete();
    controller.notifyResolveComplete();
    controller.notifyExitComplete();
    controller.notifyExitComplete();
    expect(controller.getSnapshot().phase).toBe('advance');
  });

  it('fires onPhaseChange when phase transitions', () => {
    const { controller, onPhaseChange } = createTestController(2);
    controller.notifyEnterComplete();
    expect(onPhaseChange).toHaveBeenCalledTimes(1);
  });

  it('fires onSessionComplete after all rounds completed', () => {
    const { controller, onSessionComplete } = createTestController(1);
    controller.notifyEnterComplete();
    controller.notifyWordComplete();
    controller.notifyResolveComplete();
    controller.notifyExitComplete();
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
  });

  it('dispose cancels a pending advance timer', () => {
    jest.useFakeTimers();
    const controller = createTranslationSpellingRoundController({
      roundCount: 2,
      scheduleTimer: (fn, delayMs) => {
        const id = setTimeout(fn, delayMs);
        return () => clearTimeout(id);
      },
    });
    controller.notifyEnterComplete();
    controller.notifyWordComplete();
    controller.notifyResolveComplete();
    controller.notifyExitComplete();
    expect(controller.getSnapshot().phase).toBe('advance');
    controller.dispose();
    jest.advanceTimersByTime(2000);
    expect(controller.getSnapshot().phase).toBe('advance');
    jest.useRealTimers();
  });

  it('ignores word complete after resolve', () => {
    const { controller } = createTestController(2);
    controller.notifyEnterComplete();
    controller.notifyWordComplete();
    controller.notifyWordComplete();
    expect(controller.getSnapshot().phase).toBe('resolve');
  });
});
