import { pickFieldFlowerTarget } from '../simulation/pickFieldFlowerTarget';

describe('pickFieldFlowerTarget', () => {
  it('returns a flower id from the free list', () => {
    const result = pickFieldFlowerTarget([0, 1, 2], null, 0.3);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(3);
  });

  it('excludes the last flower index', () => {
    const result = pickFieldFlowerTarget([0, 1, 2], 1, 0.5);
    expect(result).not.toBe(1);
  });

  it('returns null when no free flowers', () => {
    const result = pickFieldFlowerTarget([], null, 0.5);
    expect(result).toBeNull();
  });

  it('returns only flower from single-element list', () => {
    const result = pickFieldFlowerTarget([5], null, 0.1);
    expect(result).toBe(5);
  });

  it('rollValue 0 picks the first element', () => {
    const result = pickFieldFlowerTarget([3, 7, 11], null, 0);
    expect(result).toBe(3);
  });

  it('rollValue near 1 picks the last element', () => {
    const result = pickFieldFlowerTarget([3, 7, 11], null, 0.999);
    expect(result).toBe(11);
  });

  it('distributes picks across the list for varying rollValues', () => {
    const ids = [0, 1, 2, 3, 4];
    const picks = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const rv = (i * 0.07) % 1;
      const pick = pickFieldFlowerTarget(ids, null, rv);
      if (pick != null) picks.add(pick);
    }
    expect(picks.size).toBeGreaterThan(1);
  });

  it('same rollValue returns same result', () => {
    const a = pickFieldFlowerTarget([0, 1, 2, 3, 4], null, 0.42);
    const b = pickFieldFlowerTarget([0, 1, 2, 3, 4], null, 0.42);
    expect(a).toBe(b);
  });
});
