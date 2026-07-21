import { createRng, hashSeedString } from '../helpers/seededRandom';

describe('hashSeedString', () => {
  it('returns a finite positive integer for a non-empty string', () => {
    const h = hashSeedString('spanishPresentTable2Plural');
    expect(Number.isFinite(h)).toBe(true);
    expect(h).toBeGreaterThan(0);
    expect(Number.isInteger(h)).toBe(true);
  });

  it('returns the same hash for the same string', () => {
    const a = hashSeedString('abc');
    const b = hashSeedString('abc');
    expect(a).toBe(b);
  });

  it('returns a different hash for different strings', () => {
    const a = hashSeedString('abc');
    const b = hashSeedString('abd');
    expect(a).not.toBe(b);
  });
});

describe('createRng (mulberry32)', () => {
  it('returns a function that yields floats in [0, 1)', () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('produces the same sequence for the same seed', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    for (let i = 0; i < 50; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces a different sequence for a different seed', () => {
    const a = createRng(1);
    const b = createRng(2);
    let differing = 0;
    for (let i = 0; i < 20; i++) {
      if (a() !== b()) {
        differing++;
      }
    }
    expect(differing).toBeGreaterThan(0);
  });

  it('produces a value-dense distribution across the [0, 1) range', () => {
    const rng = createRng(42);
    let inLow = 0;
    let inHigh = 0;
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      if (v < 0.5) {
        inLow++;
      } else {
        inHigh++;
      }
    }
    expect(inLow).toBeGreaterThan(350);
    expect(inHigh).toBeGreaterThan(350);
  });
});
