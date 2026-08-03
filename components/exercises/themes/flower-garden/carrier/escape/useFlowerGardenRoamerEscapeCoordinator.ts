import { useEffect, useMemo, useRef, type RefObject } from 'react';
import type { ZoneRect } from '../../../../core/layout/computeExerciseLayout';
import type { WordSpriteLayoutBridge } from '../../../../core/types/bridgeTypes';
import type { WordOperationSequence } from '../../../../wordTransformation/domain';
import type { FlowerGardenRoamerMotionZoneController } from '../../roamer/FlowerGardenRoamerMotionZone';
import {
  createFlowerGardenRoamerEscapeCoordinator,
} from './flowerGardenRoamerEscapeCoordinator';

export type UseFlowerGardenEscapeCoordinatorParams = {
  roamerControllerRef: RefObject<FlowerGardenRoamerMotionZoneController | null>;
  spriteBridge: WordSpriteLayoutBridge | null;
  spriteRect: ZoneRect;
};

export function useFlowerGardenRoamerEscapeCoordinator(
  params: UseFlowerGardenEscapeCoordinatorParams,
): (sequence: WordOperationSequence) => void {
  const {
    roamerControllerRef,
    spriteBridge,
    spriteRect,
  } = params;

  const bridgeRef = useRef(spriteBridge);
  bridgeRef.current = spriteBridge;

  const rectRef = useRef(spriteRect);
  rectRef.current = spriteRect;

  const coordinator = useMemo(
    () =>
      createFlowerGardenRoamerEscapeCoordinator({
        getController: () =>
          roamerControllerRef.current as FlowerGardenRoamerMotionZoneController | null,
        getCellWaypoint: cellIndex => ({
          waypointX:
            bridgeRef.current?.layoutX.value[cellIndex] ??
            rectRef.current.x + rectRef.current.w * 0.5,
          waypointY:
            bridgeRef.current?.layoutY.value[cellIndex] ??
            rectRef.current.y + rectRef.current.h * 0.5,
        }),
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
