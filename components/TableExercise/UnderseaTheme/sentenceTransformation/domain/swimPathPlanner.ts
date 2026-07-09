import type { UnderseaThemeOrientation } from '../../core/layout/computeUnderseaThemeLayout';
import type { ZoneRect } from '../../core/layout/computeUnderseaThemeLayout';

export type SwimPath = {
  spawnX: number;
  spawnY: number;
  slotCenterX: number;
  slotCenterY: number;
  enterAngle: number;
  exitAngle: number;
};

export type SwimPathPlannerInput = {
  orientation: UnderseaThemeOrientation;
  screenWidth: number;
  screenHeight: number;
  jellyRect: ZoneRect;
  slotCenters: { x: number; y: number }[];
};

const SPAWN_MARGIN = 120;

function isPortrait(orientation: UnderseaThemeOrientation): boolean {
  return orientation === 'portrait';
}

function allowedEdges(orientation: UnderseaThemeOrientation): ('top' | 'left' | 'right' | 'bottom')[] {
  if (isPortrait(orientation)) {
    return ['top', 'left', 'right'];
  }
  return ['top', 'bottom', 'right'];
}

function computeSpawnPoint(
  edge: 'top' | 'left' | 'right' | 'bottom',
  fraction: number,
  jellyRect: ZoneRect,
  screenWidth: number,
  screenHeight: number,
): { x: number; y: number } {
  const padding = 0.1;
  const t = padding + fraction * (1 - 2 * padding);

  switch (edge) {
    case 'top':
      return {
        x: jellyRect.x + t * jellyRect.w,
        y: -SPAWN_MARGIN,
      };
    case 'left':
      return {
        x: -SPAWN_MARGIN,
        y: jellyRect.y + t * jellyRect.h,
      };
    case 'right':
      return {
        x: screenWidth + SPAWN_MARGIN,
        y: jellyRect.y + t * jellyRect.h,
      };
    case 'bottom':
      return {
        x: jellyRect.x + t * jellyRect.w,
        y: screenHeight + SPAWN_MARGIN,
      };
  }
}

export function planSwimPaths(input: SwimPathPlannerInput): SwimPath[] {
  const { orientation, screenWidth, screenHeight, jellyRect, slotCenters } = input;
  const slotCount = slotCenters.length;

  if (slotCount === 0) {
    return [];
  }

  const edges = allowedEdges(orientation);
  const edgeCount = edges.length;

  const counts: Record<string, number> = { top: 0, left: 0, right: 0, bottom: 0 };
  for (let i = 0; i < slotCount; i++) {
    const edge = edges[i % edgeCount];
    counts[edge]++;
  }

  const nextIndex: Record<string, number> = { top: 0, left: 0, right: 0, bottom: 0 };

  const paths: SwimPath[] = [];

  for (let i = 0; i < slotCount; i++) {
    const edge = edges[i % edgeCount];
    const idx = nextIndex[edge];
    nextIndex[edge] = idx + 1;

    const totalForEdge = counts[edge];
    const fraction = totalForEdge <= 1 ? 0.5 : idx / (totalForEdge - 1);

    const spawn = computeSpawnPoint(edge, fraction, jellyRect, screenWidth, screenHeight);
    const center = slotCenters[i]!;

    const dx = center.x - spawn.x;
    const dy = center.y - spawn.y;
    const enterAngle = Math.atan2(dy, dx);
    const exitAngle = Math.atan2(-dy, -dx);

    paths.push({
      spawnX: spawn.x,
      spawnY: spawn.y,
      slotCenterX: center.x,
      slotCenterY: center.y,
      enterAngle,
      exitAngle,
    });
  }

  return paths;
}
