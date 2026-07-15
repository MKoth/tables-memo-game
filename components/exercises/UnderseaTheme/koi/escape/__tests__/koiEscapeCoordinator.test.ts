import {
  createKoiEscapeCoordinator,
  KOI_ESCAPE_DELAY_MS,
  resolveJellyfishEscapeTarget,
  type KoiEscapeCoordinatorDeps,
} from '../koiEscapeCoordinator';
import type { WordOperationSequence } from '../../../../wordTransformation/domain';

const sampleSequence: WordOperationSequence = {
  rowIndex: 1,
  colIndex: 2,
  cellIndex: 5,
  baseWord: 'hablan',
  targetWord: 'habláis',
  operations: [],
};

function makeDeps(overrides: Partial<KoiEscapeCoordinatorDeps> = {}) {
  const controller = {
    armCaptureByWord: jest.fn(() => true),
    dispatchEscapeTo: jest.fn(),
  };
  const scheduleTimer = jest.fn((_fn: () => void, _delayMs: number) => jest.fn());

  const deps: KoiEscapeCoordinatorDeps = {
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

describe('resolveJellyfishEscapeTarget', () => {
  it('uses jelly bridge layout coordinates when available', () => {
    expect(
      resolveJellyfishEscapeTarget({
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
      resolveJellyfishEscapeTarget({
        cellIndex: 0,
        jellyBridge: null,
        jellyRect: { x: 40, y: 80, w: 120, h: 200 },
      }),
    ).toEqual({ targetX: 100, targetY: 180 });
  });
});

describe('createKoiEscapeCoordinator', () => {
  it('does nothing when the koi controller is unavailable', () => {
    const { deps, scheduleTimer } = makeDeps({ getController: () => null });

    createKoiEscapeCoordinator(deps).onSequenceSolved(sampleSequence);

    expect(scheduleTimer).not.toHaveBeenCalled();
  });

  it('does nothing when capture cannot be armed', () => {
    const { deps, controller, scheduleTimer } = makeDeps();
    controller.armCaptureByWord.mockReturnValue(false);

    createKoiEscapeCoordinator(deps).onSequenceSolved(sampleSequence);

    expect(controller.armCaptureByWord).toHaveBeenCalledWith('habláis');
    expect(scheduleTimer).not.toHaveBeenCalled();
  });

  it('arms capture then schedules escape after the default delay', () => {
    const { deps, controller, scheduleTimer } = makeDeps();
    let scheduledFn: (() => void) | undefined;
    scheduleTimer.mockImplementation((fn: () => void, delayMs: number) => {
      scheduledFn = fn;
      expect(delayMs).toBe(KOI_ESCAPE_DELAY_MS);
      return jest.fn();
    });

    createKoiEscapeCoordinator(deps).onSequenceSolved(sampleSequence);

    expect(controller.armCaptureByWord).toHaveBeenCalledWith('habláis');
    expect(scheduleTimer).toHaveBeenCalledTimes(1);

    scheduledFn!();

    expect(controller.dispatchEscapeTo).toHaveBeenCalledWith(60, 150, 5);
  });

  it('cancels a pending escape when a new sequence is solved', () => {
    const { deps, scheduleTimer } = makeDeps();
    const cancelPrevious = jest.fn();
    scheduleTimer.mockReturnValue(cancelPrevious);

    const coordinator = createKoiEscapeCoordinator(deps);
    coordinator.onSequenceSolved(sampleSequence);
    coordinator.onSequenceSolved({ ...sampleSequence, targetWord: 'coméis', cellIndex: 3 });

    expect(cancelPrevious).toHaveBeenCalledTimes(1);
    expect(scheduleTimer).toHaveBeenCalledTimes(2);
  });

  it('dispose cancels any pending escape timer', () => {
    const { deps, scheduleTimer } = makeDeps();
    const cancelPending = jest.fn();
    scheduleTimer.mockReturnValue(cancelPending);

    const coordinator = createKoiEscapeCoordinator(deps);
    coordinator.onSequenceSolved(sampleSequence);
    coordinator.dispose();

    expect(cancelPending).toHaveBeenCalledTimes(1);
  });
});
