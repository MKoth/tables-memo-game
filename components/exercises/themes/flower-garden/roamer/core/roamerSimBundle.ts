import { makeMutable, type SharedValue } from 'react-native-reanimated';
import type { ZoneRect } from '../../../../core/layout/computeExerciseLayout';
import { createRoamerRuntime } from './createRoamerRuntime';
import { createRoamerSpawnsFromWords } from './createRoamerSpawns';
import type { SpeciesWeights } from './speciesAllocator';
import { FlightState, type RoamerRuntimeEntry, type SwimZone } from './types';

export type PersistedRoamerSimBundle = {
  wordsKey: string;
  layoutKey: string;
  width: number;
  height: number;
  swimZone: SwimZone;
  runtimeEntries: RoamerRuntimeEntry[];
  sharedPositions: SharedValue<number[]>;
  fieldFlowerAnchorsX: number[];
  fieldFlowerAnchorsY: number[];
  occupantSlots: SharedValue<number[]>;
};

export function buildRoamerSimBundle(
  words: string[],
  width: number,
  height: number,
  roamerRect: ZoneRect,
  layoutKey: string,
  rng: () => number,
  fieldFlowerAnchorsX: number[] = [],
  fieldFlowerAnchorsY: number[] = [],
  speciesWeights?: SpeciesWeights,
): PersistedRoamerSimBundle {
  const swimZone: SwimZone = {
    x: roamerRect.x,
    y: roamerRect.y,
    w: roamerRect.w,
    h: roamerRect.h,
  };
  const spawns = createRoamerSpawnsFromWords(words, rng, speciesWeights);
  const runtimeEntries = spawns.map(spawn => ({
    spawn,
    runtime: createRoamerRuntime(spawn, swimZone),
  }));
  const posArr = new Array(runtimeEntries.length * 2).fill(0);
  for (let i = 0; i < runtimeEntries.length; i++) {
    posArr[i * 2] = runtimeEntries[i]!.runtime.x.value;
    posArr[i * 2 + 1] = runtimeEntries[i]!.runtime.y.value;
  }

  return {
    wordsKey: words.join('\0'),
    layoutKey,
    width,
    height,
    swimZone,
    runtimeEntries,
    sharedPositions: makeMutable(posArr),
    fieldFlowerAnchorsX,
    fieldFlowerAnchorsY,
    occupantSlots: makeMutable(new Array(fieldFlowerAnchorsX.length).fill(-1)),
  };
}

export function relayoutRoamerSimBundle(
  bundle: PersistedRoamerSimBundle,
  roamerRect: ZoneRect,
  width: number,
  height: number,
  layoutKey: string,
): void {
  const swimZone: SwimZone = {
    x: roamerRect.x,
    y: roamerRect.y,
    w: roamerRect.w,
    h: roamerRect.h,
  };

  const pos = bundle.sharedPositions.value.slice();
  const margin = 20;
  const zoneMinX = swimZone.x + margin;
  const zoneMaxX = swimZone.x + swimZone.w - margin;
  const zoneMinY = swimZone.y + margin;
  const zoneMaxY = swimZone.y + swimZone.h - margin;

  for (let i = 0; i < bundle.runtimeEntries.length; i++) {
    const roamer = bundle.runtimeEntries[i]!.runtime;
    const x = roamer.x.value;
    const y = roamer.y.value;
    const outside = x < zoneMinX || x > zoneMaxX || y < zoneMinY || y > zoneMaxY;

    if (outside) {
      const newX = zoneMinX + Math.random() * (zoneMaxX - zoneMinX);
      const newY = zoneMinY + Math.random() * (zoneMaxY - zoneMinY);
      roamer.x.value = newX;
      roamer.y.value = newY;
      roamer.state.value = FlightState.FLYING_CRUISE;
      roamer.stateTimer.value = 2 + Math.random() * 3;
      roamer.targetFlowerIndex.value = -1;
      pos[i * 2] = newX;
      pos[i * 2 + 1] = newY;
    } else {
      pos[i * 2] = x;
      pos[i * 2 + 1] = y;
    }
  }

  bundle.sharedPositions.value = pos;
  bundle.swimZone = swimZone;
  bundle.width = width;
  bundle.height = height;
  bundle.layoutKey = layoutKey;
}
