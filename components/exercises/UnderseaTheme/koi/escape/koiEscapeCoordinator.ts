import type { ZoneRect } from '../../core/layout/computeUnderseaThemeLayout';
import type { ScheduleTimer } from '../../wordTransformation/domain';
import type { WordOperationSequence } from '../../wordTransformation/domain/types';
import type { KoiSwimZoneController } from '../KoiSwimZone/types';

/** Brief pause after a sequence is solved before the koi swims to its jellyfish. */
export const KOI_ESCAPE_DELAY_MS = 700;

export type KoiEscapeController = Pick<
  KoiSwimZoneController,
  'armCaptureByWord' | 'dispatchEscapeTo'
>;

export type JellyfishEscapeLayout = {
  layoutX: { value: number[] };
  layoutY: { value: number[] };
} | null;

export type ResolveJellyfishEscapeTargetParams = {
  cellIndex: number;
  jellyBridge: JellyfishEscapeLayout;
  jellyRect: ZoneRect;
};

export function resolveJellyfishEscapeTarget({
  cellIndex,
  jellyBridge,
  jellyRect,
}: ResolveJellyfishEscapeTargetParams): { targetX: number; targetY: number } {
  return {
    targetX: jellyBridge?.layoutX.value[cellIndex] ?? jellyRect.x + jellyRect.w * 0.5,
    targetY: jellyBridge?.layoutY.value[cellIndex] ?? jellyRect.y + jellyRect.h * 0.5,
  };
}

export type KoiEscapeCoordinatorDeps = {
  getController: () => KoiEscapeController | null;
  getJellyBridge: () => JellyfishEscapeLayout;
  getJellyRect: () => ZoneRect;
  scheduleTimer: ScheduleTimer;
  escapeDelayMs?: number;
};

export type KoiEscapeCoordinator = {
  onSequenceSolved: (sequence: WordOperationSequence) => void;
  dispose: () => void;
};

export function createKoiEscapeCoordinator(
  deps: KoiEscapeCoordinatorDeps,
): KoiEscapeCoordinator {
  let cancelPendingEscape: (() => void) | null = null;
  const escapeDelayMs = deps.escapeDelayMs ?? KOI_ESCAPE_DELAY_MS;

  const clearPendingEscape = () => {
    if (cancelPendingEscape != null) {
      cancelPendingEscape();
      cancelPendingEscape = null;
    }
  };

  return {
    onSequenceSolved(sequence) {
      const koi = deps.getController();
      if (koi == null) {
        return;
      }

      const captured = koi.armCaptureByWord(sequence.targetWord);
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

        const { targetX, targetY } = resolveJellyfishEscapeTarget({
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
