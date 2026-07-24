import type { Rng } from '../../../scenery/BushShaderLayer/helpers/seededRandom';
import { assignWingPairIndices } from './wingPairAllocator';
import type { ButterflySpawn } from './types';

const TWO_PI = Math.PI * 2;

export function createRandomVisualSpawn(rng: Rng): ButterflySpawn {
  const wingPairIndex = assignWingPairIndices(1, rng)[0]!;

  return {
    xRatio: rng(),
    yRatio: rng(),
    phase: rng() * TWO_PI,
    initialAngle: rng() * TWO_PI,
    legPhaseOffsets: Array.from({ length: 6 }, () => rng() * TWO_PI),
    wingPairIndex,
  };
}

export function createButterflySpawnsFromWords(
  words: string[],
  rng: Rng,
): ButterflySpawn[] {
  const count = words.length;
  if (count === 0) return [];

  const wingPairIndices = assignWingPairIndices(count, rng);

  const spawns: ButterflySpawn[] = [];
  for (let i = 0; i < count; i++) {
    const spawn: ButterflySpawn = {
      xRatio: rng(),
      yRatio: rng(),
      phase: rng() * TWO_PI,
      initialAngle: rng() * TWO_PI,
      legPhaseOffsets: Array.from({ length: 6 }, () => rng() * TWO_PI),
      wingPairIndex: wingPairIndices[i]!,
    };
    spawns.push(spawn);
  }

  return spawns;
}
