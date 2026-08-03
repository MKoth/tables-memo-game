import type { ScheduleTimer, WordOperationSequence } from '../../../../wordTransformation/domain';

/** Brief pause after a sequence is solved before the roamer flies through the rose. */
export const FLOWER_GARDEN_ROAMER_ESCAPE_DELAY_MS = 700;

export type FlowerGardenRoamerEscapeController = {
  /** Roamer runtime index carrying `word`, or -1 when none does. */
  getRoamerIndexForWord: (word: string) => number;
  /** Arm the roamer's exit flight through the cell's rose and off-screen. */
  armEscapeByWord: (word: string, waypointX: number, waypointY: number) => boolean;
};

export type FlowerGardenEscapeCoordinatorDeps = {
  getController: () => FlowerGardenRoamerEscapeController | null;
  /** Position of the solved cell's rose (the exit-flight waypoint). */
  getCellWaypoint: (cellIndex: number) => { waypointX: number; waypointY: number };
  scheduleTimer: ScheduleTimer;
  escapeDelayMs?: number;
};

export type FlowerGardenEscapeCoordinator = {
  onSequenceSolved: (sequence: WordOperationSequence) => void;
  dispose: () => void;
};

export function createFlowerGardenRoamerEscapeCoordinator(
  deps: FlowerGardenEscapeCoordinatorDeps,
): FlowerGardenEscapeCoordinator {
  let cancelPendingEscape: (() => void) | null = null;
  const escapeDelayMs = deps.escapeDelayMs ?? FLOWER_GARDEN_ROAMER_ESCAPE_DELAY_MS;

  const clearPendingEscape = () => {
    if (cancelPendingEscape != null) {
      cancelPendingEscape();
      cancelPendingEscape = null;
    }
  };

  return {
    onSequenceSolved(sequence) {
      const controller = deps.getController();
      if (controller == null) {
        return;
      }

      if (controller.getRoamerIndexForWord(sequence.targetWord) < 0) {
        return;
      }

      clearPendingEscape();

      cancelPendingEscape = deps.scheduleTimer(() => {
        cancelPendingEscape = null;

        const currentController = deps.getController();
        if (currentController == null) {
          return;
        }

        const { waypointX, waypointY } = deps.getCellWaypoint(sequence.cellIndex);
        currentController.armEscapeByWord(sequence.targetWord, waypointX, waypointY);
      }, escapeDelayMs);
    },
    dispose() {
      clearPendingEscape();
    },
  };
}
