import { createRng } from '../../../scenery/BushShaderLayer/helpers/seededRandom';
import { allocateSpecies } from '../speciesAllocator';
import type { SpeciesWeights } from '../speciesAllocator';

describe('allocateSpecies', () => {
  it('returns an array of the requested length', () => {
    const rng = createRng(0xc0ffee);
    const result = allocateSpecies(10, { butterfly: 1, bee: 1, bumblebee: 1 }, rng);
    expect(result).toHaveLength(10);
  });

  it('every element is a valid RoamerSpecies', () => {
    const rng = createRng(0xc0ffee);
    const result = allocateSpecies(50, { butterfly: 1, bee: 1, bumblebee: 1 }, rng);
    for (const species of result) {
      expect(['butterfly', 'bee', 'bumblebee']).toContain(species);
    }
  });

  it('with [1,0,0] weights, 100% of outputs are butterfly', () => {
    const rng = createRng(0xdeadbeef);
    const result = allocateSpecies(100, { butterfly: 1, bee: 0, bumblebee: 0 }, rng);
    for (const species of result) {
      expect(species).toBe('butterfly');
    }
  });

  it('with [0,1,0] weights, 100% of outputs are bee', () => {
    const rng = createRng(0xdeadbeef);
    const result = allocateSpecies(100, { butterfly: 0, bee: 1, bumblebee: 0 }, rng);
    for (const species of result) {
      expect(species).toBe('bee');
    }
  });

  it('with [0,0,1] weights, 100% of outputs are bumblebee', () => {
    const rng = createRng(0xdeadbeef);
    const result = allocateSpecies(100, { butterfly: 0, bee: 0, bumblebee: 1 }, rng);
    for (const species of result) {
      expect(species).toBe('bumblebee');
    }
  });

  it('with equal weights, distribution is uniform within statistical tolerance', () => {
    const rng = createRng(0x12345678);
    const weights: SpeciesWeights = { butterfly: 1, bee: 1, bumblebee: 1 };
    const n = 3000;
    const result = allocateSpecies(n, weights, rng);
    const counts = { butterfly: 0, bee: 0, bumblebee: 0 };
    for (const species of result) {
      counts[species]++;
    }
    const expected = n / 3;
    const tolerance = n * 0.08;
    expect(counts.butterfly).toBeGreaterThan(expected - tolerance);
    expect(counts.butterfly).toBeLessThan(expected + tolerance);
    expect(counts.bee).toBeGreaterThan(expected - tolerance);
    expect(counts.bee).toBeLessThan(expected + tolerance);
    expect(counts.bumblebee).toBeGreaterThan(expected - tolerance);
    expect(counts.bumblebee).toBeLessThan(expected + tolerance);
  });

  it('with [2,1,1] weights, butterfly appears roughly twice as often as each other', () => {
    const rng = createRng(0xabcdef);
    const weights: SpeciesWeights = { butterfly: 2, bee: 1, bumblebee: 1 };
    const n = 4000;
    const result = allocateSpecies(n, weights, rng);
    const counts = { butterfly: 0, bee: 0, bumblebee: 0 };
    for (const species of result) {
      counts[species]++;
    }
    expect(counts.butterfly).toBeGreaterThan(counts.bee);
    expect(counts.butterfly).toBeGreaterThan(counts.bumblebee);
  });

  it('same seed produces same result (determinism)', () => {
    const seed = 0xabc;
    const rng1 = createRng(seed);
    const rng2 = createRng(seed);
    const a = allocateSpecies(20, { butterfly: 1, bee: 2, bumblebee: 3 }, rng1);
    const b = allocateSpecies(20, { butterfly: 1, bee: 2, bumblebee: 3 }, rng2);
    expect(a).toEqual(b);
  });

  it('different seed produces different result', () => {
    const a = allocateSpecies(20, { butterfly: 1, bee: 1, bumblebee: 1 }, createRng(1));
    const b = allocateSpecies(20, { butterfly: 1, bee: 1, bumblebee: 1 }, createRng(2));
    expect(a).not.toEqual(b);
  });

  it('returns empty array for count 0', () => {
    const rng = createRng(0xc0ffee);
    const result = allocateSpecies(0, { butterfly: 1, bee: 1, bumblebee: 1 }, rng);
    expect(result).toEqual([]);
  });
});
