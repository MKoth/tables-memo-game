import type { Rng } from '../../scenery/BushShaderLayer/helpers/seededRandom';
import { assignWingPairIndices } from './wingPairAllocator';
import { allocateSpecies } from './speciesAllocator';
import { ROAMER_SPECIES_WEIGHTS } from './speciesConfig';
import type { RoamerSpawn } from './types';
import { ROAMER_BUTTERFLY_LEG_TRIPOD_OFFSETS } from '../butterfly/config/butterflySimConfig';

const TWO_PI = Math.PI * 2;

function makeTripodLegOffsets(basePhase: number): number[] {
  return ROAMER_BUTTERFLY_LEG_TRIPOD_OFFSETS.map(offset => {
    const val = offset + basePhase;
    return val - Math.floor(val / TWO_PI) * TWO_PI;
  });
}

export function createRandomVisualSpawn(rng: Rng): RoamerSpawn {
  const wingPairIndex = assignWingPairIndices(1, rng)[0]!;
  const legBasePhase = rng() * TWO_PI;
  const species = allocateSpecies(1, ROAMER_SPECIES_WEIGHTS, rng)[0]!;

  return {
    xRatio: rng(),
    yRatio: rng(),
    phase: rng() * TWO_PI,
    initialAngle: rng() * TWO_PI,
    legPhaseOffsets: makeTripodLegOffsets(legBasePhase),
    wingPairIndex,
    species,
  };
}

export function createRoamerSpawnsFromWords(
  words: string[],
  rng: Rng,
): RoamerSpawn[] {
  const count = words.length;
  if (count === 0) return [];

  const wingPairIndices = assignWingPairIndices(count, rng);
  const species = allocateSpecies(count, ROAMER_SPECIES_WEIGHTS, rng);

  const spawns: RoamerSpawn[] = [];
  for (let i = 0; i < count; i++) {
    const legBasePhase = rng() * TWO_PI;
    const spawn: RoamerSpawn = {
      xRatio: rng(),
      yRatio: rng(),
      phase: rng() * TWO_PI,
      initialAngle: rng() * TWO_PI,
      legPhaseOffsets: makeTripodLegOffsets(legBasePhase),
      wingPairIndex: wingPairIndices[i]!,
      species: species[i]!,
    };
    spawns.push(spawn);
  }

  return spawns;
}
