import {
  createFlowerGardenRoamerEscapeCoordinator,
  FLOWER_GARDEN_ROAMER_ESCAPE_DELAY_MS,
  type FlowerGardenEscapeCoordinatorDeps,
} from '../flowerGardenRoamerEscapeCoordinator';
import type { WordOperationSequence } from '../../../../../wordTransformation/domain';

const sampleSequence: WordOperationSequence = {
  rowIndex: 1,
  colIndex: 2,
  cellIndex: 5,
  baseWord: 'hablan',
  targetWord: 'habláis',
  operations: [],
};

function makeDeps(overrides: Partial<FlowerGardenEscapeCoordinatorDeps> = {}) {
  const controller = {
    getRoamerIndexForWord: jest.fn(() => 3),
    armEscapeByWord: jest.fn(() => true),
  };
  const scheduleTimer = jest.fn((_fn: () => void, _delayMs: number) => jest.fn());

  const deps: FlowerGardenEscapeCoordinatorDeps = {
    getController: () => controller,
    getCellWaypoint: (cellIndex: number) => ({
      waypointX: 100 + cellIndex * 10,
      waypointY: 200 + cellIndex * 5,
    }),
    scheduleTimer,
    ...overrides,
  };

  return { deps, controller, scheduleTimer };
}

describe('createFlowerGardenRoamerEscapeCoordinator', () => {
  it('does nothing when the roamer controller is unavailable', () => {
    const { deps, scheduleTimer } = makeDeps({ getController: () => null });

    createFlowerGardenRoamerEscapeCoordinator(deps).onSequenceSolved(sampleSequence);

    expect(scheduleTimer).not.toHaveBeenCalled();
  });

  it('does nothing when no roamer carries the target word', () => {
    const { deps, controller, scheduleTimer } = makeDeps();
    controller.getRoamerIndexForWord.mockReturnValue(-1);

    createFlowerGardenRoamerEscapeCoordinator(deps).onSequenceSolved(sampleSequence);

    expect(controller.getRoamerIndexForWord).toHaveBeenCalledWith('habláis');
    expect(scheduleTimer).not.toHaveBeenCalled();
  });

  it('looks up the roamer then schedules the escape after the default delay', () => {
    const { deps, controller, scheduleTimer } = makeDeps();
    let scheduledFn: (() => void) | undefined;
    scheduleTimer.mockImplementation((fn: () => void, delayMs: number) => {
      scheduledFn = fn;
      expect(delayMs).toBe(FLOWER_GARDEN_ROAMER_ESCAPE_DELAY_MS);
      return jest.fn();
    });

    createFlowerGardenRoamerEscapeCoordinator(deps).onSequenceSolved(sampleSequence);

    expect(controller.getRoamerIndexForWord).toHaveBeenCalledWith('habláis');
    expect(scheduleTimer).toHaveBeenCalledTimes(1);

    scheduledFn!();

    expect(controller.armEscapeByWord).toHaveBeenCalledWith('habláis', 150, 225);
  });

  it('resolves the exit waypoint from the solved cell position before dispatching', () => {
    const { deps, controller, scheduleTimer } = makeDeps();
    const getCellWaypoint = jest.fn((cellIndex: number) => ({
      waypointX: cellIndex * 100,
      waypointY: cellIndex * 50,
    }));
    deps.getCellWaypoint = getCellWaypoint;
    let scheduledFn: (() => void) | undefined;
    scheduleTimer.mockImplementation((fn: () => void) => {
      scheduledFn = fn;
      return jest.fn();
    });

    createFlowerGardenRoamerEscapeCoordinator(deps).onSequenceSolved(sampleSequence);
    scheduledFn!();

    expect(getCellWaypoint).toHaveBeenCalledWith(5);
    expect(controller.armEscapeByWord).toHaveBeenCalledWith('habláis', 500, 250);
  });

  it('cancels a pending escape when a new sequence is solved', () => {
    const { deps, scheduleTimer } = makeDeps();
    const cancelPrevious = jest.fn();
    scheduleTimer.mockReturnValue(cancelPrevious);

    const coordinator = createFlowerGardenRoamerEscapeCoordinator(deps);
    coordinator.onSequenceSolved(sampleSequence);
    coordinator.onSequenceSolved({ ...sampleSequence, targetWord: 'coméis', cellIndex: 3 });

    expect(cancelPrevious).toHaveBeenCalledTimes(1);
    expect(scheduleTimer).toHaveBeenCalledTimes(2);
  });

  it('dispose cancels any pending escape timer', () => {
    const { deps, scheduleTimer } = makeDeps();
    const cancelPending = jest.fn();
    scheduleTimer.mockReturnValue(cancelPending);

    const coordinator = createFlowerGardenRoamerEscapeCoordinator(deps);
    coordinator.onSequenceSolved(sampleSequence);
    coordinator.dispose();

    expect(cancelPending).toHaveBeenCalledTimes(1);
  });
});
