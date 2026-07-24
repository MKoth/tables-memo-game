import { createRng } from '../../../scenery/BushShaderLayer/helpers/seededRandom';
import { assignWingPairIndices } from '../simulation/wingPairAllocator';
import { ROAMER_BUTTERFLY_WING_PAIR_COUNT } from '../config/butterflySimConfig';

describe('assignWingPairIndices', () => {
  it('every output is in [0, ROAMER_BUTTERFLY_WING_PAIR_COUNT)', () => {
    const rng = createRng(0xc0ffee);
    const result = assignWingPairIndices(20, rng);
    for (const idx of result) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(ROAMER_BUTTERFLY_WING_PAIR_COUNT);
    }
  });

  it('for n <= 9, no duplicates', () => {
    const rng = createRng(0xc0ffee);
    const result = assignWingPairIndices(9, rng);
    const seen = new Set(result);
    expect(seen.size).toBe(9);
  });

  it('for n = 1, returns a single valid index', () => {
    const rng = createRng(0xc0ffee);
    const result = assignWingPairIndices(1, rng);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeGreaterThanOrEqual(0);
    expect(result[0]).toBeLessThan(ROAMER_BUTTERFLY_WING_PAIR_COUNT);
  });

  it('for n = 9, returns a permutation of [0..9)', () => {
    const rng = createRng(0xc0ffee);
    const result = assignWingPairIndices(9, rng);
    expect(result).toHaveLength(9);
    const sorted = [...result].sort((a, b) => a - b);
    for (let i = 0; i < 9; i++) {
      expect(sorted[i]).toBe(i);
    }
  });

  it('for n = 10, first 9 are a permutation of [0..9), 10th follows round-robin from startOffset', () => {
    const rng = createRng(0xdeadbeef);
    const result = assignWingPairIndices(10, rng);
    expect(result).toHaveLength(10);

    const first9 = result.slice(0, 9);
    const sorted = [...first9].sort((a, b) => a - b);
    for (let i = 0; i < 9; i++) {
      expect(sorted[i]).toBe(i);
    }

    const last = result[9]!;
    expect(last).toBeGreaterThanOrEqual(0);
    expect(last).toBeLessThan(ROAMER_BUTTERFLY_WING_PAIR_COUNT);
  });

  it('for n = 18, round-robin produces no element more than 9 times', () => {
    const rng = createRng(0x12345678);
    const result = assignWingPairIndices(18, rng);
    expect(result).toHaveLength(18);

    const counts = new Array<number>(ROAMER_BUTTERFLY_WING_PAIR_COUNT).fill(0);
    for (const idx of result) {
      counts[idx]!++;
    }
    for (let i = 0; i < ROAMER_BUTTERFLY_WING_PAIR_COUNT; i++) {
      expect(counts[i]).toBeLessThanOrEqual(9);
    }
  });

  it('for n = 27, round-robin produces 3 full cycles', () => {
    const rng = createRng(0xabcdef01);
    const result = assignWingPairIndices(27, rng);
    expect(result).toHaveLength(27);

    const counts = new Array<number>(ROAMER_BUTTERFLY_WING_PAIR_COUNT).fill(0);
    for (const idx of result) {
      counts[idx]!++;
    }
    for (let i = 0; i < ROAMER_BUTTERFLY_WING_PAIR_COUNT; i++) {
      expect(counts[i]).toBe(3);
    }
  });

  it('same seed produces same result', () => {
    const seed = 0xabc;
    const rng1 = createRng(seed);
    const rng2 = createRng(seed);
    const a = assignWingPairIndices(12, rng1);
    const b = assignWingPairIndices(12, rng2);
    expect(a).toEqual(b);
  });

  it('different seed produces different result', () => {
    const a = assignWingPairIndices(12, createRng(1));
    const b = assignWingPairIndices(12, createRng(2));
    expect(a).not.toEqual(b);
  });

  it('for n = 0, returns empty array', () => {
    const rng = createRng(0xc0ffee);
    const result = assignWingPairIndices(0, rng);
    expect(result).toEqual([]);
  });

  it('first 9 of n=10 are a permutation (specific startOffset check)', () => {
    const rng = createRng(0x42);
    const result = assignWingPairIndices(10, rng);
    const first9 = result.slice(0, 9);
    const sorted = [...first9].sort((a, b) => a - b);
    for (let i = 0; i < 9; i++) {
      expect(sorted[i]).toBe(i);
    }
  });

  it('round-robin indices 9..n-1 follow (startOffset + (i-9)) % 9 offset pattern', () => {
    const rng = createRng(0x99);
    const n = 15;
    const result = assignWingPairIndices(n, rng);

    const first9 = result.slice(0, 9);
    const sorted = [...first9].sort((a, b) => a - b);
    for (let i = 0; i < 9; i++) {
      expect(sorted[i]).toBe(i);
    }

    const usedInFirst9 = new Set(first9);
    expect(usedInFirst9.size).toBe(9);

    const firstExtra = result[9]!;
    expect(usedInFirst9.has(firstExtra)).toBe(true);
  });
});
