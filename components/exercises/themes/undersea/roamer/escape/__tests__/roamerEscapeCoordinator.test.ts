import {
  createRoamerEscapeCoordinator,
  ROAMER_ESCAPE_DELAY_MS,
  resolveWordSpriteEscapeTarget,
  type RoamerEscapeCoordinatorDeps,
} from '../roamerEscapeCoordinator';
import type { WordOperationSequence } from '../../../../../wordTransformation/domain';

const sampleSequence: WordOperationSequence = {
  rowIndex: 1,
  colIndex: 2,
  cellIndex: 5,
  baseWord: 'hablan',
  targetWord: 'habláis',
  operations: [],
};

function makeDeps(overrides: Partial<RoamerEscapeCoordinatorDeps> = {}) {
  const controller = {
    armCaptureByWord: jest.fn(() => true),
    dispatchEscapeTo: jest.fn(),
  };
  const scheduleTimer = jest.fn((_fn: () => void, _delayMs: number) => jest.fn());

  const deps: RoamerEscapeCoordinatorDeps = {
    getController: () => controller,
    getJellyBridge: () => ({
      layoutX: { value: [10, 20, 30, 40, 50, 60] },
      layoutY: { value: [100, 110, 120, 130, 140, 150] },
    }),
    getJellyRect: () => ({ x: 0, y: 0, w: 200, h: 400 }),
    scheduleTimer,
    ...overrides,
  };

  return { deps, controller, scheduleTimer };
}

describe('resolveWordSpriteEscapeTarget', () => {
  it('uses jelly bridge layout coordinates when available', () => {
    expect(
      resolveWordSpriteEscapeTarget({
        cellIndex: 2,
        jellyBridge: {
          layoutX: { value: [10, 20, 30] },
          layoutY: { value: [100, 110, 120] },
        },
        jellyRect: { x: 0, y: 0, w: 200, h: 400 },
      }),
    ).toEqual({ targetX: 30, targetY: 120 });
  });

  it('falls back to jelly rect center when bridge is null', () => {
    expect(
      resolveWordSpriteEscapeTarget({
        cellIndex: 0,
        jellyBridge: null,
        jellyRect: { x: 40, y: 80, w: 120, h: 200 },
      }),
    ).toEqual({ targetX: 100, targetY: 180 });
  });
});

describe('createRoamerEscapeCoordinator', () => {
  it('does nothing when the roamer controller is unavailable', () => {
    const { deps, scheduleTimer } = makeDeps({ getController: () => null });

    createRoamerEscapeCoordinator(deps).onSequenceSolved(sampleSequence);

    expect(scheduleTimer).not.toHaveBeenCalled();
  });

  it('does nothing when capture cannot be armed', () => {
    const { deps, controller, scheduleTimer } = makeDeps();
    controller.armCaptureByWord.mockReturnValue(false);

    createRoamerEscapeCoordinator(deps).onSequenceSolved(sampleSequence);

    expect(controller.armCaptureByWord).toHaveBeenCalledWith('habláis');
    expect(scheduleTimer).not.toHaveBeenCalled();
  });

  it('arms capture then schedules escape after the default delay', () => {
    const { deps, controller, scheduleTimer } = makeDeps();
    let scheduledFn: (() => void) | undefined;
    scheduleTimer.mockImplementation((fn: () => void, delayMs: number) => {
      scheduledFn = fn;
      expect(delayMs).toBe(ROAMER_ESCAPE_DELAY_MS);
      return jest.fn();
    });

    createRoamerEscapeCoordinator(deps).onSequenceSolved(sampleSequence);

    expect(controller.armCaptureByWord).toHaveBeenCalledWith('habláis');
    expect(scheduleTimer).toHaveBeenCalledTimes(1);

    scheduledFn!();

    expect(controller.dispatchEscapeTo).toHaveBeenCalledWith(60, 150, 5);
  });

  it('cancels a pending escape when a new sequence is solved', () => {
    const { deps, scheduleTimer } = makeDeps();
    const cancelPrevious = jest.fn();
    scheduleTimer.mockReturnValue(cancelPrevious);

    const coordinator = createRoamerEscapeCoordinator(deps);
    coordinator.onSequenceSolved(sampleSequence);
    coordinator.onSequenceSolved({ ...sampleSequence, targetWord: 'coméis', cellIndex: 3 });

    expect(cancelPrevious).toHaveBeenCalledTimes(1);
    expect(scheduleTimer).toHaveBeenCalledTimes(2);
  });

  it('dispose cancels any pending escape timer', () => {
    const { deps, scheduleTimer } = makeDeps();
    const cancelPending = jest.fn();
    scheduleTimer.mockReturnValue(cancelPending);

    const coordinator = createRoamerEscapeCoordinator(deps);
    coordinator.onSequenceSolved(sampleSequence);
    coordinator.dispose();

    expect(cancelPending).toHaveBeenCalledTimes(1);
  });
});
