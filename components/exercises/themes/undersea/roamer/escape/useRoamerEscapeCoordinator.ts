import { useEffect, useMemo, useRef, type RefObject } from 'react';
import type { ZoneRect } from '../../../../core/layout/computeExerciseLayout';
import type { WordOperationSequence } from '../../../../wordTransformation/domain';
import type { RoamerSwimZoneController } from '../RoamerSwimZone/types';
import {
  createRoamerEscapeCoordinator,
  type WordSpriteEscapeLayout,
} from './roamerEscapeCoordinator';

export type UseRoamerEscapeCoordinatorParams = {
  roamerControllerRef: RefObject<RoamerSwimZoneController | null>;
  jellyBridge: WordSpriteEscapeLayout;
  jellyRect: ZoneRect;
};

export function useRoamerEscapeCoordinator({
  roamerControllerRef,
  jellyBridge,
  jellyRect,
}: UseRoamerEscapeCoordinatorParams): (sequence: WordOperationSequence) => void {
  const jellyBridgeRef = useRef(jellyBridge);
  jellyBridgeRef.current = jellyBridge;

  const jellyRectRef = useRef(jellyRect);
  jellyRectRef.current = jellyRect;

  const coordinator = useMemo(
    () =>
      createRoamerEscapeCoordinator({
        getController: () => roamerControllerRef.current,
        getJellyBridge: () => jellyBridgeRef.current,
        getJellyRect: () => jellyRectRef.current,
        scheduleTimer: (fn, delayMs) => {
          const id = setTimeout(fn, delayMs);
          return () => clearTimeout(id);
        },
      }),
    [roamerControllerRef],
  );

  useEffect(() => () => coordinator.dispose(), [coordinator]);

  return coordinator.onSequenceSolved;
}
