import { createRng } from '../../../scenery/BushShaderLayer/helpers/seededRandom';
import {
  createRandomVisualSpawn,
  createButterflySpawnsFromWords,
} from '../simulation/createButterflySpawns';
import { ROAMER_BUTTERFLY_WING_PAIR_COUNT } from '../config/butterflySimConfig';

describe('createRandomVisualSpawn', () => {
  it('returns a spawn with wingPairIndex in [0, ROAMER_BUTTERFLY_WING_PAIR_COUNT)', () => {
    const rng = createRng(0xc0ffee);
    const spawn = createRandomVisualSpawn(rng);
    expect(spawn.wingPairIndex).toBeGreaterThanOrEqual(0);
    expect(spawn.wingPairIndex).toBeLessThan(ROAMER_BUTTERFLY_WING_PAIR_COUNT);
  });

  it('returns xRatio in [0, 1]', () => {
    const rng = createRng(0xc0ffee);
    const spawn = createRandomVisualSpawn(rng);
    expect(spawn.xRatio).toBeGreaterThanOrEqual(0);
    expect(spawn.xRatio).toBeLessThanOrEqual(1);
  });

  it('returns yRatio in [0, 1]', () => {
    const rng = createRng(0xc0ffee);
    const spawn = createRandomVisualSpawn(rng);
    expect(spawn.yRatio).toBeGreaterThanOrEqual(0);
    expect(spawn.yRatio).toBeLessThanOrEqual(1);
  });

  it('returns phase as a valid radian value', () => {
    const rng = createRng(0xc0ffee);
    const spawn = createRandomVisualSpawn(rng);
    expect(spawn.phase).toBeGreaterThanOrEqual(0);
    expect(spawn.phase).toBeLessThanOrEqual(6.2831855);
  });

  it('returns initialAngle as a valid radian value', () => {
    const rng = createRng(0xc0ffee);
    const spawn = createRandomVisualSpawn(rng);
    expect(spawn.initialAngle).toBeGreaterThanOrEqual(0);
    expect(spawn.initialAngle).toBeLessThanOrEqual(6.2831855);
  });

  it('returns wingLeftPhaseOffset as a valid radian value', () => {
    const rng = createRng(0xc0ffee);
    const spawn = createRandomVisualSpawn(rng);
    expect(spawn.wingLeftPhaseOffset).toBeGreaterThanOrEqual(0);
    expect(spawn.wingLeftPhaseOffset).toBeLessThanOrEqual(6.2831855);
  });

  it('returns wingRightPhaseOffset as a valid radian value', () => {
    const rng = createRng(0xc0ffee);
    const spawn = createRandomVisualSpawn(rng);
    expect(spawn.wingRightPhaseOffset).toBeGreaterThanOrEqual(0);
    expect(spawn.wingRightPhaseOffset).toBeLessThanOrEqual(6.2831855);
  });

  it('returns positive wing frequencies', () => {
    const rng = createRng(0xc0ffee);
    const spawn = createRandomVisualSpawn(rng);
    expect(spawn.wingLeftFreq).toBeGreaterThan(0);
    expect(spawn.wingRightFreq).toBeGreaterThan(0);
  });

  it('returns legPhaseOffsets with 6 entries', () => {
    const rng = createRng(0xc0ffee);
    const spawn = createRandomVisualSpawn(rng);
    expect(spawn.legPhaseOffsets).toHaveLength(6);
    for (const offset of spawn.legPhaseOffsets) {
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThanOrEqual(6.2831855);
    }
  });

  it('same seed produces same spawn', () => {
    const seed = 0xabc;
    const rng1 = createRng(seed);
    const rng2 = createRng(seed);
    const a = createRandomVisualSpawn(rng1);
    const b = createRandomVisualSpawn(rng2);
    expect(a).toEqual(b);
  });

  it('different seed produces different spawn', () => {
    const a = createRandomVisualSpawn(createRng(1));
    const b = createRandomVisualSpawn(createRng(2));
    expect(a).not.toEqual(b);
  });
});

describe('createButterflySpawnsFromWords', () => {
  it('returns one spawn per word', () => {
    const words = ['hablo', 'hablas', 'habla'];
    const rng = createRng(0xc0ffee);
    const spawns = createButterflySpawnsFromWords(words, rng);
    expect(spawns).toHaveLength(3);
  });

  it('returns empty array for empty words', () => {
    const rng = createRng(0xc0ffee);
    const spawns = createButterflySpawnsFromWords([], rng);
    expect(spawns).toEqual([]);
  });

  it('every spawn has wingPairIndex in [0, ROAMER_BUTTERFLY_WING_PAIR_COUNT)', () => {
    const words = ['uno', 'dos', 'tres', 'cuatro', 'cinco'];
    const rng = createRng(0xc0ffee);
    const spawns = createButterflySpawnsFromWords(words, rng);
    for (const spawn of spawns) {
      expect(spawn.wingPairIndex).toBeGreaterThanOrEqual(0);
      expect(spawn.wingPairIndex).toBeLessThan(ROAMER_BUTTERFLY_WING_PAIR_COUNT);
    }
  });

  it('for n <= 9, no two spawns share wingPairIndex', () => {
    const words = ['a', 'b', 'c', 'd', 'e', 'f'];
    const rng = createRng(0xc0ffee);
    const spawns = createButterflySpawnsFromWords(words, rng);
    const indices = spawns.map(s => s.wingPairIndex);
    const seen = new Set(indices);
    expect(seen.size).toBe(indices.length);
  });

  it('for n > 9, round-robin is observable (indices repeat)', () => {
    const words = Array.from({ length: 12 }, (_, i) => `word${i}`);
    const rng = createRng(0xc0ffee);
    const spawns = createButterflySpawnsFromWords(words, rng);
    const indices = spawns.map(s => s.wingPairIndex);
    const first9 = indices.slice(0, 9);
    const first9Set = new Set(first9);
    expect(first9Set.size).toBe(9);
    const last3 = indices.slice(9);
    for (const idx of last3) {
      expect(first9Set.has(idx)).toBe(true);
    }
  });

  it('every spawn has xRatio and yRatio in [0, 1]', () => {
    const words = ['a', 'b', 'c'];
    const rng = createRng(0xc0ffee);
    const spawns = createButterflySpawnsFromWords(words, rng);
    for (const spawn of spawns) {
      expect(spawn.xRatio).toBeGreaterThanOrEqual(0);
      expect(spawn.xRatio).toBeLessThanOrEqual(1);
      expect(spawn.yRatio).toBeGreaterThanOrEqual(0);
      expect(spawn.yRatio).toBeLessThanOrEqual(1);
    }
  });

  it('positions are not all identical (variation exists)', () => {
    const words = ['a', 'b', 'c', 'd', 'e'];
    const rng = createRng(0xc0ffee);
    const spawns = createButterflySpawnsFromWords(words, rng);
    const xPositions = new Set(spawns.map(s => s.xRatio));
    expect(xPositions.size).toBeGreaterThan(1);
  });

  it('same seed produces same spawns', () => {
    const words = ['a', 'b', 'c'];
    const seed = 0xabc;
    const rng1 = createRng(seed);
    const rng2 = createRng(seed);
    const a = createButterflySpawnsFromWords(words, rng1);
    const b = createButterflySpawnsFromWords(words, rng2);
    expect(a).toEqual(b);
  });

  it('different seed produces different spawns', () => {
    const words = ['a', 'b', 'c'];
    const a = createButterflySpawnsFromWords(words, createRng(1));
    const b = createButterflySpawnsFromWords(words, createRng(2));
    expect(a).not.toEqual(b);
  });
});
