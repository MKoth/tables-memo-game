import type { EscapeExitEdge } from '../../../../core';

export type RoamerExitPath = {
  leg1: { x: number; y: number };
  leg2: { x: number; y: number };
  exitEdge: EscapeExitEdge;
};

export type ResolveRoamerExitPathParams = {
  waypointX: number;
  waypointY: number;
  screenWidth: number;
  screenHeight: number;
  /** How far beyond the screen edge the final leg target sits. */
  margin?: number;
};

/**
 * Two-leg exit path for the table match escape: the roamer flies from its
 * current position through the matched rose (leg 1) and continues to an
 * off-screen point beyond the screen edge nearest the rose (leg 2), so the
 * path reads as a single constant-speed swoop through the rose.
 */
export function resolveRoamerExitPath({
  waypointX,
  waypointY,
  screenWidth,
  screenHeight,
  margin = 180,
}: ResolveRoamerExitPathParams): RoamerExitPath {
  const distances = {
    top: waypointY,
    bottom: screenHeight - waypointY,
    left: waypointX,
    right: screenWidth - waypointX,
  } as const;

  let exitEdge: EscapeExitEdge = 'top';
  let minDist = Infinity;
  for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
    const d = distances[edge];
    if (d < minDist) {
      minDist = d;
      exitEdge = edge;
    }
  }

  const exit: { x: number; y: number } = (() => {
    switch (exitEdge) {
      case 'top':
        return { x: waypointX, y: -margin };
      case 'bottom':
        return { x: waypointX, y: screenHeight + margin };
      case 'left':
        return { x: -margin, y: waypointY };
      case 'right':
        return { x: screenWidth + margin, y: waypointY };
    }
  })();

  return {
    leg1: { x: waypointX, y: waypointY },
    leg2: exit,
    exitEdge,
  };
}

/** Wrapper that also snapshots the start point (used by the escape arming worklet). */
export type RoamerExitLegs = {
  leg1X: number;
  leg1Y: number;
  leg2X: number;
  leg2Y: number;
};

export function resolveRoamerExitLegs(params: ResolveRoamerExitPathParams): RoamerExitLegs {
  const path = resolveRoamerExitPath(params);
  return {
    leg1X: path.leg1.x,
    leg1Y: path.leg1.y,
    leg2X: path.leg2.x,
    leg2Y: path.leg2.y,
  };
}
