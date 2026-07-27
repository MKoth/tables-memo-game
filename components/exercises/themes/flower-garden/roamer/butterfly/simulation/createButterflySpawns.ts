import type { Rng } from '../../../scenery/BushShaderLayer/helpers/seededRandom';
import { assignWingPairIndices } from './wingPairAllocator';
import type { ButterflySpawn } from './types';
import { ROAMER_BUTTERFLY_LEG_TRIPOD_OFFSETS } from '../config/butterflySimConfig';

const TWO_PI = Math.PI * 2;

function makeTripodLegOffsets(basePhase: number): number[] {
  return ROAMER_BUTTERFLY_LEG_TRIPOD_OFFSETS.map(offset => {
    const val = offset + basePhase;
    return val - Math.floor(val / TWO_PI) * TWO_PI;
  });
}

export function createRandomVisualSpawn(rng: Rng): ButterflySpawn {
  const wingPairIndex = assignWingPairIndices(1, rng)[0]!;
  const legBasePhase = rng() * TWO_PI;

  return {
    xRatio: rng(),
    yRatio: rng(),
    phase: rng() * TWO_PI,
    initialAngle: rng() * TWO_PI,
    legPhaseOffsets: makeTripodLegOffsets(legBasePhase),
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
    const legBasePhase = rng() * TWO_PI;
    const spawn: ButterflySpawn = {
      xRatio: rng(),
      yRatio: rng(),
      phase: rng() * TWO_PI,
      initialAngle: rng() * TWO_PI,
      legPhaseOffsets: makeTripodLegOffsets(legBasePhase),
      wingPairIndex: wingPairIndices[i]!,
    };
    spawns.push(spawn);
  }

  return spawns;
}
