import type { Rng } from '../../../scenery/BushShaderLayer/helpers/seededRandom';
import { ROAMER_BUTTERFLY_WING_PAIR_COUNT } from '../config/butterflySimConfig';

function fisherYatesShuffle(arr: number[], rng: Rng): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

export function assignWingPairIndices(
  n: number,
  rng: Rng,
): number[] {
  const count = ROAMER_BUTTERFLY_WING_PAIR_COUNT;

  const pool = Array.from({ length: count }, (_, i) => i);
  fisherYatesShuffle(pool, rng);

  let result: number[];

  if (n <= count) {
    result = pool.slice(0, n);
  } else {
    const startOffset = Math.floor(rng() * count);
    result = [];
    for (let i = 0; i < n; i++) {
      if (i < count) {
        result.push(pool[i]!);
      } else {
        result.push((startOffset + (i - count)) % count);
      }
    }
  }

  const elementCounts = new Array<number>(count).fill(0);
  for (const idx of result) {
    if (idx < 0 || idx >= count || !Number.isInteger(idx)) {
      throw new Error(
        `assignWingPairIndices: invalid index ${idx} — expected integer in [0, ${count})`,
      );
    }
    elementCounts[idx]!++;
    if (elementCounts[idx]! > count) {
      throw new Error(
        `assignWingPairIndices: index ${idx} appears ${elementCounts[idx]} times, ` +
          `exceeds max ${count}`,
      );
    }
  }

  return result;
}
