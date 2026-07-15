import { useEffect, useMemo, useRef, type RefObject } from 'react';
import type { ZoneRect } from '../../../core/layout/computeExerciseLayout';
import type { WordOperationSequence } from '../../../wordTransformation/domain';
import type { KoiSwimZoneController } from '../KoiSwimZone/types';
import {
  createKoiEscapeCoordinator,
  type JellyfishEscapeLayout,
} from './koiEscapeCoordinator';

export type UseKoiEscapeCoordinatorParams = {
  koiControllerRef: RefObject<KoiSwimZoneController | null>;
  jellyBridge: JellyfishEscapeLayout;
  jellyRect: ZoneRect;
};

export function useKoiEscapeCoordinator({
  koiControllerRef,
  jellyBridge,
  jellyRect,
}: UseKoiEscapeCoordinatorParams): (sequence: WordOperationSequence) => void {
  const jellyBridgeRef = useRef(jellyBridge);
  jellyBridgeRef.current = jellyBridge;

  const jellyRectRef = useRef(jellyRect);
  jellyRectRef.current = jellyRect;

  const coordinator = useMemo(
    () =>
      createKoiEscapeCoordinator({
        getController: () => koiControllerRef.current,
        getJellyBridge: () => jellyBridgeRef.current,
        getJellyRect: () => jellyRectRef.current,
        scheduleTimer: (fn, delayMs) => {
          const id = setTimeout(fn, delayMs);
          return () => clearTimeout(id);
        },
      }),
    [koiControllerRef],
  );

  useEffect(() => () => coordinator.dispose(), [coordinator]);

  return coordinator.onSequenceSolved;
}
