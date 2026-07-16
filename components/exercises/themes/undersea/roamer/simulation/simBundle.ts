import { makeMutable, type SharedValue } from 'react-native-reanimated';
import { ROAMER_SETTINGS } from '../config/roamerFishSettings';
import { ROAMER_FISH_BODY_INSET } from '../config/roamerInstanceConfig';
import type { ZoneRect } from '../../../../core/layout/computeExerciseLayout';
import type { RoamerRuntimeEntry, SwimZone } from './types';
import { createFishRuntime } from './createFishRuntime';
import { createRoamerSpawnsFromWords } from './createRoamerSpawns';

export type PersistedSimBundle = {
  wordsKey: string;
  layoutKey: string;
  width: number;
  height: number;
  swimZone: SwimZone;
  runtimeEntries: RoamerRuntimeEntry[];
  sharedPositions: SharedValue<number[]>;
};

export function buildSimBundle(
  words: string[],
  width: number,
  height: number,
  roamerRect: ZoneRect,
  layoutKey: string,
): PersistedSimBundle {
  const swimZone: SwimZone = {
    x: roamerRect.x,
    y: roamerRect.y,
    w: roamerRect.w,
    h: roamerRect.h,
  };
  const spawns = createRoamerSpawnsFromWords(words);
  const runtimeEntries = spawns.map(spawn => ({
    spawn,
    runtime: createFishRuntime({ ...ROAMER_SETTINGS, ...spawn }, swimZone),
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
  };
}

export function relayoutSimBundle(
  bundle: PersistedSimBundle,
  roamerRect: ZoneRect,
  width: number,
  height: number,
  layoutKey: string,
  capturedFishIndex: number,
  eliminated: number[],
): void {
  const swimZone: SwimZone = {
    x: roamerRect.x,
    y: roamerRect.y,
    w: roamerRect.w,
    h: roamerRect.h,
  };
  const minX = swimZone.x + ROAMER_FISH_BODY_INSET;
  const maxX = swimZone.x + swimZone.w - ROAMER_FISH_BODY_INSET;
  const minY = swimZone.y + ROAMER_FISH_BODY_INSET;
  const maxY = swimZone.y + swimZone.h - ROAMER_FISH_BODY_INSET;

  const pos = bundle.sharedPositions.value.slice();
  for (let i = 0; i < bundle.runtimeEntries.length; i++) {
    if (i === capturedFishIndex || eliminated.includes(i)) {
      continue;
    }
    const fish = bundle.runtimeEntries[i]!.runtime;
    fish.x.value = Math.min(maxX, Math.max(minX, fish.x.value));
    fish.y.value = Math.min(maxY, Math.max(minY, fish.y.value));
    pos[i * 2] = fish.x.value;
    pos[i * 2 + 1] = fish.y.value;
  }

  bundle.sharedPositions.value = pos;
  bundle.swimZone = swimZone;
  bundle.width = width;
  bundle.height = height;
  bundle.layoutKey = layoutKey;
}
