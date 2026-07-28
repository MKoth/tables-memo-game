import type { RoamerSpecies } from './types';
import type { Rng } from '../../scenery/BushShaderLayer/helpers/seededRandom';

export type SpeciesWeights = {
  butterfly: number;
  bee: number;
  bumblebee: number;
};

function pickWeighted(rng: Rng, weights: SpeciesWeights): RoamerSpecies {
  const total = weights.butterfly + weights.bee + weights.bumblebee;
  const roll = rng() * total;
  let cumulative = 0;
  cumulative += weights.butterfly;
  if (roll < cumulative) return 'butterfly';
  cumulative += weights.bee;
  if (roll < cumulative) return 'bee';
  return 'bumblebee';
}

export function allocateSpecies(
  count: number,
  weights: SpeciesWeights,
  rng: Rng,
): RoamerSpecies[] {
  const result: RoamerSpecies[] = [];
  for (let i = 0; i < count; i++) {
    result.push(pickWeighted(rng, weights));
  }
  return result;
}
