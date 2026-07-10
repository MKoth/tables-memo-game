import {
  createVariantSelectionRoundController,
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
    onPhaseChange,
    onSessionComplete,
    ...overrides,
  });
  return { controller, timers, onPhaseChange, onSessionComplete };
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

  it('fires onPhaseChange when phase transitions', () => {
    const { controller, onPhaseChange } = createTestController(2);
    controller.notifyRowEnterComplete();
    expect(onPhaseChange).toHaveBeenCalledTimes(1);
  });

  it('fires onSessionComplete after all rounds completed', () => {
    const { controller } = createTestController(1);
    controller.notifyRowEnterComplete();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'transform',
      roundPos: 0,
      isSessionComplete: false,
    });
  });
});
