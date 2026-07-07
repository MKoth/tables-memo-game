import {
  ROUND_HOLD_DURATION_MS,
  ROUND_ROW_EXIT_EDGE,
} from '../roundResolutionTiming';
import {
  createSentenceRoundOrchestrator,
  type SentenceRoundPhase,
} from '../sentenceRoundOrchestrator';

function createTestOrchestrator(
  roundCount: number,
  overrides: Partial<Parameters<typeof createSentenceRoundOrchestrator>[0]> = {},
) {
  const timers: Array<{ fn: () => void; delayMs: number }> = [];
  const scheduleTimer = (fn: () => void, delayMs: number) => {
    timers.push({ fn, delayMs });
    return () => {};
  };
  const onPhaseChange = jest.fn();
  const onSessionComplete = jest.fn();

  const orchestrator = createSentenceRoundOrchestrator({
    roundCount,
    scheduleTimer,
    holdDurationMs: ROUND_HOLD_DURATION_MS,
    onPhaseChange,
    onSessionComplete,
    ...overrides,
  });

  return { orchestrator, timers, onPhaseChange, onSessionComplete };
}

function runHoldTimer(timers: Array<{ fn: () => void; delayMs: number }>) {
  const holdTimer = timers.find((timer) => timer.delayMs === ROUND_HOLD_DURATION_MS);
  expect(holdTimer).toBeDefined();
  holdTimer!.fn();
}

describe('createSentenceRoundOrchestrator', () => {
  it('starts in enter on the first round with the configured exit edge', () => {
    const { orchestrator } = createTestOrchestrator(3);

    expect(orchestrator.getSnapshot()).toEqual({
      phase: 'enter',
      roundPos: 0,
      exitEdge: ROUND_ROW_EXIT_EDGE,
      isSessionComplete: false,
      solvedWord: null,
      blankFilled: false,
    });
  });

  it('moves enter → transform when the entrance animation finishes', () => {
    const { orchestrator } = createTestOrchestrator(2);

    orchestrator.notifyEnterComplete();

    expect(orchestrator.getSnapshot().phase).toBe('transform');
  });

  it('runs merge → resolve → hold on transformation completion', () => {
    const { orchestrator, timers } = createTestOrchestrator(2);

    orchestrator.notifyEnterComplete();
    orchestrator.notifySequenceComplete('cantamos');

    expect(orchestrator.getSnapshot()).toMatchObject({
      phase: 'merge',
      solvedWord: 'cantamos',
      blankFilled: false,
    });

    orchestrator.notifyMergeComplete();
    expect(orchestrator.getSnapshot().phase).toBe('resolve');

    orchestrator.notifyResolveComplete();
    expect(orchestrator.getSnapshot()).toMatchObject({
      phase: 'hold',
      blankFilled: true,
    });
    expect(timers).toHaveLength(1);
    expect(timers[0]?.delayMs).toBe(ROUND_HOLD_DURATION_MS);
  });

  it('respects the injected hold duration before pop', () => {
    jest.useFakeTimers();
    const onPhaseChange = jest.fn();
    const orchestrator = createSentenceRoundOrchestrator({
      roundCount: 1,
      scheduleTimer: (fn, delayMs) => {
        const id = setTimeout(fn, delayMs);
        return () => clearTimeout(id);
      },
      holdDurationMs: 1500,
      onPhaseChange,
    });

    orchestrator.notifyEnterComplete();
    orchestrator.notifySequenceComplete('hablo');
    orchestrator.notifyMergeComplete();
    orchestrator.notifyResolveComplete();

    expect(orchestrator.getSnapshot().phase).toBe('hold');
    jest.advanceTimersByTime(1499);
    expect(orchestrator.getSnapshot().phase).toBe('hold');

    jest.advanceTimersByTime(1);
    expect(orchestrator.getSnapshot().phase).toBe('pop');

    orchestrator.dispose();
    jest.useRealTimers();
  });

  it('runs pop → exit → advance → enter for the next round', () => {
    const { orchestrator, timers } = createTestOrchestrator(3);

    orchestrator.notifyEnterComplete();
    orchestrator.notifySequenceComplete('cantamos');
    orchestrator.notifyMergeComplete();
    orchestrator.notifyResolveComplete();
    runHoldTimer(timers);
    orchestrator.notifyPopComplete();
    expect(orchestrator.getSnapshot().phase).toBe('exit');

    orchestrator.notifyExitComplete();
    expect(orchestrator.getSnapshot()).toMatchObject({
      phase: 'enter',
      roundPos: 1,
      solvedWord: null,
      blankFilled: false,
      isSessionComplete: false,
    });
  });

  it('passes through advance before the next round enter', () => {
    const phases: SentenceRoundPhase[] = [];
    const timers: Array<{ fn: () => void; delayMs: number }> = [];
    const orchestrator = createSentenceRoundOrchestrator({
      roundCount: 2,
      scheduleTimer: (fn, delayMs) => {
        timers.push({ fn, delayMs });
        return () => {};
      },
      onPhaseChange: () => phases.push(orchestrator.getSnapshot().phase),
    });

    orchestrator.notifyEnterComplete();
    orchestrator.notifySequenceComplete('cantamos');
    orchestrator.notifyMergeComplete();
    orchestrator.notifyResolveComplete();
    runHoldTimer(timers);
    orchestrator.notifyPopComplete();
    orchestrator.notifyExitComplete();

    expect(phases).toContain('advance');
    expect(orchestrator.getSnapshot().phase).toBe('enter');
  });

  it('marks the session complete after the final round exits', () => {
    const { orchestrator, timers, onSessionComplete } = createTestOrchestrator(1);

    orchestrator.notifyEnterComplete();
    orchestrator.notifySequenceComplete('hablo');
    orchestrator.notifyMergeComplete();
    orchestrator.notifyResolveComplete();
    runHoldTimer(timers);
    orchestrator.notifyPopComplete();
    orchestrator.notifyExitComplete();

    expect(orchestrator.getSnapshot()).toMatchObject({
      phase: 'advance',
      roundPos: 1,
      isSessionComplete: true,
    });
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate events while a phase is in flight', () => {
    const { orchestrator } = createTestOrchestrator(2);

    orchestrator.notifyEnterComplete();
    orchestrator.notifySequenceComplete('uno');
    orchestrator.notifySequenceComplete('dos');

    expect(orchestrator.getSnapshot()).toMatchObject({
      phase: 'merge',
      solvedWord: 'uno',
    });
  });
});
