import type { ZoneRect } from '../../../../core/layout/computeExerciseLayout';
import type { ScheduleTimer } from '../../../../wordTransformation/domain';
import type { WordOperationSequence } from '../../../../wordTransformation/domain/types';
import type { RoamerSwimZoneController } from '../RoamerSwimZone/types';

/** Brief pause after a sequence is solved before the roamer swims to its wordSprite. */
export const ROAMER_ESCAPE_DELAY_MS = 700;

export type RoamerEscapeController = Pick<
  RoamerSwimZoneController,
  'armCaptureByWord' | 'dispatchEscapeTo'
>;

export type WordSpriteEscapeLayout = {
  layoutX: { value: number[] };
  layoutY: { value: number[] };
} | null;

export type ResolveWordSpriteEscapeTargetParams = {
  cellIndex: number;
  jellyBridge: WordSpriteEscapeLayout;
  jellyRect: ZoneRect;
};

export function resolveWordSpriteEscapeTarget({
  cellIndex,
  jellyBridge,
  jellyRect,
}: ResolveWordSpriteEscapeTargetParams): { targetX: number; targetY: number } {
  return {
    targetX: jellyBridge?.layoutX.value[cellIndex] ?? jellyRect.x + jellyRect.w * 0.5,
    targetY: jellyBridge?.layoutY.value[cellIndex] ?? jellyRect.y + jellyRect.h * 0.5,
  };
}

export type RoamerEscapeCoordinatorDeps = {
  getController: () => RoamerEscapeController | null;
  getJellyBridge: () => WordSpriteEscapeLayout;
  getJellyRect: () => ZoneRect;
  scheduleTimer: ScheduleTimer;
  escapeDelayMs?: number;
};

export type RoamerEscapeCoordinator = {
  onSequenceSolved: (sequence: WordOperationSequence) => void;
  dispose: () => void;
};

export function createRoamerEscapeCoordinator(
  deps: RoamerEscapeCoordinatorDeps,
): RoamerEscapeCoordinator {
  let cancelPendingEscape: (() => void) | null = null;
  const escapeDelayMs = deps.escapeDelayMs ?? ROAMER_ESCAPE_DELAY_MS;

  const clearPendingEscape = () => {
    if (cancelPendingEscape != null) {
      cancelPendingEscape();
      cancelPendingEscape = null;
    }
  };

  return {
    onSequenceSolved(sequence) {
      const roamer = deps.getController();
      if (roamer == null) {
        return;
      }

      const captured = roamer.armCaptureByWord(sequence.targetWord);
      if (!captured) {
        return;
      }

      clearPendingEscape();

      cancelPendingEscape = deps.scheduleTimer(() => {
        cancelPendingEscape = null;

        const controller = deps.getController();
        if (controller == null) {
          return;
        }

        const { targetX, targetY } = resolveWordSpriteEscapeTarget({
          cellIndex: sequence.cellIndex,
          jellyBridge: deps.getJellyBridge(),
          jellyRect: deps.getJellyRect(),
        });
        controller.dispatchEscapeTo(targetX, targetY, sequence.cellIndex);
      }, escapeDelayMs);
    },
    dispose() {
      clearPendingEscape();
    },
  };
}
