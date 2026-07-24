import { makeMutable, type SharedValue } from 'react-native-reanimated';
import type { ZoneRect } from '../../../../../core/layout/computeExerciseLayout';
import { createButterflyRuntime } from './createButterflyRuntime';
import { createButterflySpawnsFromWords } from './createButterflySpawns';
import type { ButterflyRuntimeEntry, SwimZone } from './types';

export type PersistedButterflySimBundle = {
  wordsKey: string;
  layoutKey: string;
  width: number;
  height: number;
  swimZone: SwimZone;
  runtimeEntries: ButterflyRuntimeEntry[];
  sharedPositions: SharedValue<number[]>;
};

export function buildButterflySimBundle(
  words: string[],
  width: number,
  height: number,
  roamerRect: ZoneRect,
  layoutKey: string,
  rng: () => number,
): PersistedButterflySimBundle {
  const swimZone: SwimZone = {
    x: roamerRect.x,
    y: roamerRect.y,
    w: roamerRect.w,
    h: roamerRect.h,
  };
  const spawns = createButterflySpawnsFromWords(words, rng);
  const runtimeEntries = spawns.map(spawn => ({
    spawn,
    runtime: createButterflyRuntime(spawn, swimZone),
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

export function relayoutButterflySimBundle(
  bundle: PersistedButterflySimBundle,
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
  for (let i = 0; i < bundle.runtimeEntries.length; i++) {
    const butterfly = bundle.runtimeEntries[i]!.runtime;
    pos[i * 2] = butterfly.x.value;
    pos[i * 2 + 1] = butterfly.y.value;
  }

  bundle.sharedPositions.value = pos;
  bundle.swimZone = swimZone;
  bundle.width = width;
  bundle.height = height;
  bundle.layoutKey = layoutKey;
}
