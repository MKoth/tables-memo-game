import { createMatchSessionController } from '../matchSessionController';

function createTestController(pairCount = 8) {
  const onPhaseChange = jest.fn();
  const onSessionComplete = jest.fn();
  const controller = createMatchSessionController({
    pairCount,
    onPhaseChange,
    onSessionComplete,
  });
  return { controller, onPhaseChange, onSessionComplete };
}

describe('createMatchSessionController', () => {
  it('starts in idle with no capture', () => {
    const { controller } = createTestController();
    expect(controller.getSnapshot()).toEqual({
      phase: 'idle',
      capturedFishIndex: -1,
      capturedEnglish: null,
      matchedIndices: [],
      allMatched: false,
    });
  });

  it('transitions from idle to select on captureFish', () => {
    const { controller } = createTestController();
    const result = controller.captureFish(2, 'hello');
    expect(result).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'select',
      capturedFishIndex: 2,
      capturedEnglish: 'hello',
    });
  });

  it('ignores second captureFish while in select', () => {
    const { controller, onPhaseChange } = createTestController();
    controller.captureFish(2, 'hello');
    onPhaseChange.mockClear();

    const result = controller.captureFish(5, 'world');
    expect(result).toBe(false);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'select',
      capturedFishIndex: 2,
      capturedEnglish: 'hello',
    });
    expect(onPhaseChange).not.toHaveBeenCalled();
  });

  it('transitions from select to idle on release', () => {
    const { controller } = createTestController();
    controller.captureFish(2, 'hello');
    controller.release();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'idle',
      capturedFishIndex: -1,
      capturedEnglish: null,
    });
  });

  it('release while idle is a no-op', () => {
    const { controller, onPhaseChange } = createTestController();
    controller.release();
    expect(controller.getSnapshot().phase).toBe('idle');
    expect(onPhaseChange).not.toHaveBeenCalled();
  });

  it('fires onPhaseChange on capture and release', () => {
    const { controller, onPhaseChange } = createTestController();
    controller.captureFish(0, 'cat');
    expect(onPhaseChange).toHaveBeenCalledTimes(1);
    controller.release();
    expect(onPhaseChange).toHaveBeenCalledTimes(2);
  });

  it('captureFish while idle returns true', () => {
    const { controller } = createTestController();
    expect(controller.captureFish(0, 'cat')).toBe(true);
  });

  it('captureFish while in select returns false', () => {
    const { controller } = createTestController();
    controller.captureFish(0, 'cat');
    expect(controller.captureFish(1, 'dog')).toBe(false);
  });

  it('correctMatch while idle is ignored', () => {
    const { controller } = createTestController(4);
    controller.correctMatch(2);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'idle',
      matchedIndices: [],
    });
  });

  it('correctMatch transitions from select to resolve and marks matched', () => {
    const { controller } = createTestController(4);
    controller.captureFish(0, 'cat');
    controller.correctMatch(2);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'resolve',
      matchedIndices: [2],
      capturedFishIndex: 0,
      capturedEnglish: 'cat',
      allMatched: false,
    });
  });

  it('correctMatch does not duplicate an already matched index', () => {
    const { controller } = createTestController(4);
    controller.captureFish(0, 'cat');
    controller.correctMatch(2);
    controller.correctMatch(2);
    expect(controller.getSnapshot().matchedIndices).toEqual([2]);
  });

  it('correctMatch while not in select is ignored', () => {
    const { controller } = createTestController(4);
    controller.correctMatch(0);
    expect(controller.getSnapshot().matchedIndices).toEqual([]);
  });

  it('allMatched is true when all pairs are matched', () => {
    const { controller } = createTestController(2);
    controller.captureFish(0, 'cat');
    controller.correctMatch(0);
    expect(controller.getSnapshot().allMatched).toBe(false);
    controller.resolveComplete();
    controller.captureFish(0, 'dog');
    controller.correctMatch(1);
    expect(controller.getSnapshot().allMatched).toBe(true);
  });

  it('fires onSessionComplete when all pairs are matched', () => {
    const { controller, onSessionComplete } = createTestController(2);
    controller.captureFish(0, 'cat');
    controller.correctMatch(0);
    expect(onSessionComplete).not.toHaveBeenCalled();
    controller.resolveComplete();
    controller.captureFish(0, 'dog');
    controller.correctMatch(1);
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
  });

  it('fires onSessionComplete exactly once', () => {
    const { controller, onSessionComplete } = createTestController(1);
    controller.captureFish(0, 'cat');
    controller.correctMatch(0);
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    controller.correctMatch(0);
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
  });

  it('wrongMatch stays in select phase', () => {
    const { controller, onPhaseChange } = createTestController(4);
    controller.captureFish(0, 'cat');
    onPhaseChange.mockClear();
    controller.wrongMatch();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'select',
      capturedFishIndex: 0,
      capturedEnglish: 'cat',
    });
    expect(onPhaseChange).not.toHaveBeenCalled();
  });

  it('wrongMatch while idle is a no-op', () => {
    const { controller } = createTestController(4);
    controller.wrongMatch();
    expect(controller.getSnapshot().phase).toBe('idle');
  });

  it('resolveComplete transitions from resolve to idle', () => {
    const { controller } = createTestController(4);
    controller.captureFish(0, 'cat');
    controller.correctMatch(2);
    controller.resolveComplete();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'idle',
      capturedFishIndex: -1,
      capturedEnglish: null,
      matchedIndices: [2],
    });
  });

  it('resolveComplete while not in resolve is a no-op', () => {
    const { controller, onPhaseChange } = createTestController(4);
    onPhaseChange.mockClear();
    controller.resolveComplete();
    expect(onPhaseChange).not.toHaveBeenCalled();
    expect(controller.getSnapshot().phase).toBe('idle');
  });

  it('captureFish works after resolveComplete (next capture)', () => {
    const { controller } = createTestController(4);
    controller.captureFish(0, 'cat');
    controller.correctMatch(2);
    controller.resolveComplete();
    const result = controller.captureFish(1, 'dog');
    expect(result).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'select',
      capturedFishIndex: 1,
      capturedEnglish: 'dog',
    });
  });

  it('fires onPhaseChange for correctMatch and resolveComplete', () => {
    const { controller, onPhaseChange } = createTestController();
    controller.captureFish(0, 'cat');
    onPhaseChange.mockClear();
    controller.correctMatch(2);
    expect(onPhaseChange).toHaveBeenCalledTimes(1);
    controller.resolveComplete();
    expect(onPhaseChange).toHaveBeenCalledTimes(2);
  });

  it('dispose resets the controller', () => {
    const { controller } = createTestController();
    controller.captureFish(2, 'hello');
    controller.dispose();
    expect(controller.getSnapshot()).toEqual({
      phase: 'idle',
      capturedFishIndex: -1,
      capturedEnglish: null,
      matchedIndices: [],
      allMatched: false,
    });
  });
});
