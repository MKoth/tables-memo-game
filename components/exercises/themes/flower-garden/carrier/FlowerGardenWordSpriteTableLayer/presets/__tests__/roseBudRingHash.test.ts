import {
  MAX_PETAL_SLOTS,
  MAX_PETALS,
  MAX_RINGS,
} from '../../../../shaders/roseBudDeform.sksl';
import { computeRoseBudRingHashes } from '../roseBudRingHash';

describe('computeRoseBudRingHashes', () => {
  it('fills one border and one width value per ring-petal slot', () => {
    const hashes = computeRoseBudRingHashes(1);

    expect(MAX_PETAL_SLOTS).toBe(MAX_RINGS * MAX_PETALS);
    expect(hashes.ringHashBorder).toHaveLength(MAX_PETAL_SLOTS);
    expect(hashes.ringHashWidth).toHaveLength(MAX_PETAL_SLOTS);
  });

  it('keeps every value in [0, 1)', () => {
    const hashes = computeRoseBudRingHashes(1);

    for (const value of [...hashes.ringHashBorder, ...hashes.ringHashWidth]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is deterministic per seed', () => {
    expect(computeRoseBudRingHashes(4)).toEqual(computeRoseBudRingHashes(4));
  });

  it('differs across seeds', () => {
    const a = computeRoseBudRingHashes(1);
    const b = computeRoseBudRingHashes(2);

    expect(a.ringHashBorder).not.toEqual(b.ringHashBorder);
    expect(a.ringHashWidth).not.toEqual(b.ringHashWidth);
  });

  it('lays border at component 0 and width at component 1 of the ringHash formula', () => {
    const seed = 3;
    const hashes = computeRoseBudRingHashes(seed);

    expect(hashes.ringHashBorder[1 * MAX_PETALS + 0]).toBeCloseTo(0.7433089702963116, 12);
    expect(hashes.ringHashWidth[3 * MAX_PETALS + 7]).toBeCloseTo(0.9773336200596532, 12);
    expect(hashes.ringHashWidth[0 * MAX_PETALS + 15]).toBeCloseTo(0.093826163916674, 12);
  });
});
