import {
  bubbleEnterDurationMs,
  ROUND_HOLD_DURATION_MS,
  ROUND_ROW_EXIT_EDGE,
} from '../roundResolutionTiming';
import {
  createSentenceRoundController,
  type SentenceRoundPhase,
} from '../sentenceRoundController';

function createTestController(
  roundCount: number,
  overrides: Partial<Parameters<typeof createSentenceRoundController>[0]> = {},
) {
  const timers: Array<{ fn: () => void; delayMs: number }> = [];
  const scheduleTimer = (fn: () => void, delayMs: number) => {
    timers.push({ fn, delayMs });
    return () => {};
  };
  const onPhaseChange = jest.fn();
  const onSessionComplete = jest.fn();

  const controller = createSentenceRoundController({
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
  const holdTimer = timers.find((timer) => timer.delayMs === ROUND_HOLD_DURATION_MS);
  expect(holdTimer).toBeDefined();
  holdTimer!.fn();
}

function runStaggerTimer(
  timers: Array<{ fn: () => void; delayMs: number }>,
  wordLength: number,
) {
  const staggerTimer = timers.find(
    (timer) => timer.delayMs === bubbleEnterDurationMs(wordLength),
  );
  expect(staggerTimer).toBeDefined();
  staggerTimer!.fn();
}

describe('createSentenceRoundController', () => {
  it('starts in enter on the first round with the configured exit edge', () => {
    const { controller } = createTestController(3);

    expect(controller.getSnapshot()).toEqual({
      phase: 'enter',
      roundPos: 0,
      exitEdge: ROUND_ROW_EXIT_EDGE,
      isSessionComplete: false,
      solvedWord: null,
    });
  });

  it('schedules bubble-enter stagger after row enter then moves to transform', () => {
    const { controller, timers } = createTestController(2);
    const wordLength = 8;

    controller.configureRound({ wordLength });
    controller.notifyRowEnterComplete();

    expect(controller.getSnapshot().phase).toBe('enter');
    expect(timers).toHaveLength(1);
    expect(timers[0]?.delayMs).toBe(bubbleEnterDurationMs(wordLength));

    runStaggerTimer(timers, wordLength);
    expect(controller.getSnapshot().phase).toBe('transform');
  });

  it('moves transform → merge on sequence completion', () => {
    const { controller, timers } = createTestController(2);

    controller.configureRound({ wordLength: 5 });
    controller.notifyRowEnterComplete();
    runStaggerTimer(timers, 5);
    controller.notifySequenceComplete('cantamos');

    expect(controller.getSnapshot()).toMatchObject({
      phase: 'merge',
      solvedWord: 'cantamos',
    });
  });

  it('runs merge → materialize → resolve → hold on transformation completion', () => {
    const { controller, timers } = createTestController(2);

    controller.configureRound({ wordLength: 5 });
    controller.notifyRowEnterComplete();
    runStaggerTimer(timers, 5);
    controller.notifySequenceComplete('cantamos');

    controller.notifyMergeComplete();
    expect(controller.getSnapshot().phase).toBe('materialize');

    controller.notifyMaterializeComplete();
    expect(controller.getSnapshot().phase).toBe('resolve');

    controller.notifyResolveComplete();
    expect(controller.getSnapshot().phase).toBe('hold');
    const holdTimers = timers.filter((timer) => timer.delayMs === ROUND_HOLD_DURATION_MS);
    expect(holdTimers).toHaveLength(1);
  });

  it('respects the injected hold duration before pop', () => {
    jest.useFakeTimers();
    const onPhaseChange = jest.fn();
    const controller = createSentenceRoundController({
      roundCount: 1,
      scheduleTimer: (fn, delayMs) => {
        const id = setTimeout(fn, delayMs);
        return () => clearTimeout(id);
      },
      holdDurationMs: 1500,
      onPhaseChange,
    });

    controller.configureRound({ wordLength: 4 });
    controller.notifyRowEnterComplete();
    jest.advanceTimersByTime(bubbleEnterDurationMs(4));
    controller.notifySequenceComplete('hablo');
    controller.notifyMergeComplete();
    controller.notifyMaterializeComplete();
    controller.notifyResolveComplete();

    expect(controller.getSnapshot().phase).toBe('hold');
    jest.advanceTimersByTime(1499);
    expect(controller.getSnapshot().phase).toBe('hold');

    jest.advanceTimersByTime(1);
    expect(controller.getSnapshot().phase).toBe('pop');

    controller.dispose();
    jest.useRealTimers();
  });

  it('runs pop → exit → advance → enter for the next round', () => {
    const { controller, timers } = createTestController(3);

    controller.configureRound({ wordLength: 5 });
    controller.notifyRowEnterComplete();
    runStaggerTimer(timers, 5);
    controller.notifySequenceComplete('cantamos');
    controller.notifyMergeComplete();
    controller.notifyMaterializeComplete();
    controller.notifyResolveComplete();
    runHoldTimer(timers);
    controller.notifyPopComplete();
    expect(controller.getSnapshot().phase).toBe('exit');

    controller.notifyExitComplete();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'enter',
      roundPos: 1,
      solvedWord: null,
      isSessionComplete: false,
    });
  });

  it('passes through advance before the next round enter', () => {
    const phases: SentenceRoundPhase[] = [];
    const timers: Array<{ fn: () => void; delayMs: number }> = [];
    const controller = createSentenceRoundController({
      roundCount: 2,
      scheduleTimer: (fn, delayMs) => {
        timers.push({ fn, delayMs });
        return () => {};
      },
      onPhaseChange: () => phases.push(controller.getSnapshot().phase),
    });

    controller.configureRound({ wordLength: 5 });
    controller.notifyRowEnterComplete();
    runStaggerTimer(timers, 5);
    controller.notifySequenceComplete('cantamos');
    controller.notifyMergeComplete();
    controller.notifyMaterializeComplete();
    controller.notifyResolveComplete();
    runHoldTimer(timers);
    controller.notifyPopComplete();
    controller.notifyExitComplete();

    expect(phases).toContain('advance');
    expect(controller.getSnapshot().phase).toBe('enter');
  });

  it('marks the session complete after the final round exits', () => {
    const { controller, timers, onSessionComplete } = createTestController(1);

    controller.configureRound({ wordLength: 4 });
    controller.notifyRowEnterComplete();
    runStaggerTimer(timers, 4);
    controller.notifySequenceComplete('hablo');
    controller.notifyMergeComplete();
    controller.notifyMaterializeComplete();
    controller.notifyResolveComplete();
    runHoldTimer(timers);
    controller.notifyPopComplete();
    controller.notifyExitComplete();

    expect(controller.getSnapshot()).toMatchObject({
      phase: 'advance',
      roundPos: 1,
      isSessionComplete: true,
    });
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate row-enter events while stagger is pending', () => {
    const { controller, timers } = createTestController(2);
    const wordLength = 5;

    controller.configureRound({ wordLength });
    controller.notifyRowEnterComplete();
    controller.notifyRowEnterComplete();

    expect(timers).toHaveLength(1);
    expect(controller.getSnapshot().phase).toBe('enter');
  });

  it('ignores duplicate events while a phase is in flight', () => {
    const { controller, timers } = createTestController(2);

    controller.configureRound({ wordLength: 3 });
    controller.notifyRowEnterComplete();
    runStaggerTimer(timers, 3);
    controller.notifySequenceComplete('uno');
    controller.notifySequenceComplete('dos');

    expect(controller.getSnapshot()).toMatchObject({
      phase: 'merge',
      solvedWord: 'uno',
    });
  });

  it('dispose cancels a pending hold timer', () => {
    jest.useFakeTimers();
    const controller = createSentenceRoundController({
      roundCount: 1,
      scheduleTimer: (fn, delayMs) => {
        const id = setTimeout(fn, delayMs);
        return () => clearTimeout(id);
      },
      holdDurationMs: 1500,
    });

    controller.configureRound({ wordLength: 4 });
    controller.notifyRowEnterComplete();
    jest.advanceTimersByTime(bubbleEnterDurationMs(4));
    controller.notifySequenceComplete('hablo');
    controller.notifyMergeComplete();
    controller.notifyMaterializeComplete();
    controller.notifyResolveComplete();

    expect(controller.getSnapshot().phase).toBe('hold');
    controller.dispose();
    jest.advanceTimersByTime(2000);
    expect(controller.getSnapshot().phase).toBe('hold');

    jest.useRealTimers();
  });
});
