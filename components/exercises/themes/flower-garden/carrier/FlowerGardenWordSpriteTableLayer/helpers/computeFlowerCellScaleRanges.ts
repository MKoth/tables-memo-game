import type { LayoutBounds, LayoutParticle } from '../../../../undersea/carrier/WordSpriteTableLayer/layout/computeWordSpriteLayout';
import { computeLayoutPositions } from '../../../../undersea/carrier/WordSpriteTableLayer/layout/computeWordSpriteLayout';

const BIAS_SAMPLES: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 0],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export type FlowerCellScaleRanges = {
  minScales: number[];
  maxScales: number[];
};

export function computeFlowerCellScaleRanges(
  particles: LayoutParticle[],
  bounds: LayoutBounds,
): FlowerCellScaleRanges {
  const count = particles.length;
  const minScales = new Array<number>(count).fill(Number.POSITIVE_INFINITY);
  const maxScales = new Array<number>(count).fill(Number.NEGATIVE_INFINITY);

  for (let s = 0; s < BIAS_SAMPLES.length; s++) {
    const sample = BIAS_SAMPLES[s]!;
    const layout = computeLayoutPositions(particles, bounds, sample[0], sample[1]);
    const scales = layout.scales;
    for (let i = 0; i < count; i++) {
      const v = scales[i]!;
      if (v < minScales[i]!) {
        minScales[i] = v;
      }
      if (v > maxScales[i]!) {
        maxScales[i] = v;
      }
    }
  }

  return { minScales, maxScales };
}
