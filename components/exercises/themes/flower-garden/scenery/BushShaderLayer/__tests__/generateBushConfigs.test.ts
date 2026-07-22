import { createRng } from '../helpers/seededRandom';
import {
  generateBushConfigs,
  type GenerateBushConfigsInput,
} from '../generateBushConfigs';
import type { ZoneRect } from '../../../../../core';

const GROUND_BAND: ZoneRect = { x: 0, y: 600, w: 400, h: 80 };

function makeRoses(
  count: number,
  centerX = 200,
  centerY = 300,
  spacingX = 60,
  spacingY = 80,
) {
  const cols = Math.ceil(Math.sqrt(count));
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    xs.push(centerX + (col - (cols - 1) / 2) * spacingX);
    ys.push(centerY + (row - (Math.ceil(count / cols) - 1) / 2) * spacingY);
  }
  return { xs, ys };
}

function buildInput(
  overrides: Partial<GenerateBushConfigsInput> = {},
): GenerateBushConfigsInput {
  const nRoses = overrides.nRoses ?? 19;
  const { xs, ys } = makeRoses(nRoses);
  return {
    tableId: overrides.tableId ?? 'spanishPresentTable2Plural',
    nRoses,
    roseIndices: Array.from({ length: nRoses }, (_, i) => i),
    roseGridPositions: xs.map((x, i) => ({ x, y: ys[i]! })),
    groundBand: overrides.groundBand ?? GROUND_BAND,
    stemBaseSpreadRadius: overrides.stemBaseSpreadRadius ?? 22,
    stemBaseWidth: overrides.stemBaseWidth ?? 3,
    stemTopWidth: overrides.stemTopWidth ?? 18,
    leavesPerStemRange: overrides.leavesPerStemRange ?? [5, 9],
    rng: overrides.rng ?? createRng(0xc0ffee),
  };
}

function collectAllStems(configs: ReturnType<typeof generateBushConfigs>) {
  return configs.flatMap(b => b.stems);
}

function collectAllLeaves(configs: ReturnType<typeof generateBushConfigs>) {
  return collectAllStems(configs).flatMap(s => s.leaves);
}

describe('generateBushConfigs', () => {
  it('places bush count in [ceil(nRoses/6), ceil(nRoses/4)] for nRoses=19', () => {
    const configs = generateBushConfigs(buildInput({ nRoses: 19 }));
    const min = Math.ceil(19 / 6);
    const max = Math.ceil(19 / 4);
    expect(configs.length).toBeGreaterThanOrEqual(min);
    expect(configs.length).toBeLessThanOrEqual(max);
  });

  it('assigns every rose to exactly one stem', () => {
    const configs = generateBushConfigs(buildInput({ nRoses: 19 }));
    const stems = collectAllStems(configs);
    const assigned = stems.map(s => s.roseIndex).sort((a, b) => a - b);
    const expected = Array.from({ length: 19 }, (_, i) => i);
    expect(assigned).toEqual(expected);
  });

  it('keeps every bush base inside the groundBand rect', () => {
    const configs = generateBushConfigs(buildInput({ nRoses: 19 }));
    for (const bush of configs) {
      expect(bush.baseX).toBeGreaterThanOrEqual(GROUND_BAND.x);
      expect(bush.baseX).toBeLessThanOrEqual(GROUND_BAND.x + GROUND_BAND.w);
      expect(bush.baseY).toBeGreaterThanOrEqual(GROUND_BAND.y);
      expect(bush.baseY).toBeLessThanOrEqual(GROUND_BAND.y + GROUND_BAND.h);
    }
  });

  it('keeps every stem base within stemBaseSpreadRadius of its bush base', () => {
    const radius = 22;
    const configs = generateBushConfigs(
      buildInput({ nRoses: 19, stemBaseSpreadRadius: radius }),
    );
    for (const bush of configs) {
      for (const stem of bush.stems) {
        const dx = stem.baseX - bush.baseX;
        const dy = stem.baseY - bush.baseY;
        expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(radius + 1e-6);
      }
    }
  });

  it('produces a valid config for nRoses=1 (single bush, single stem)', () => {
    const configs = generateBushConfigs(buildInput({ nRoses: 1 }));
    expect(configs.length).toBe(1);
    expect(configs[0]!.stems.length).toBe(1);
    expect(configs[0]!.stems[0]!.roseIndex).toBe(0);
  });

  it('produces a valid config for nRoses=27', () => {
    const configs = generateBushConfigs(buildInput({ nRoses: 27 }));
    const min = Math.ceil(27 / 6);
    const max = Math.ceil(27 / 4);
    expect(configs.length).toBeGreaterThanOrEqual(min);
    expect(configs.length).toBeLessThanOrEqual(max);
    const stems = collectAllStems(configs);
    expect(stems.length).toBe(27);
  });

  it('keeps every leaf t in [0.05, 0.95]', () => {
    const configs = generateBushConfigs(buildInput({ nRoses: 19 }));
    const leaves = collectAllLeaves(configs);
    expect(leaves.length).toBeGreaterThan(0);
    for (const leaf of leaves) {
      expect(leaf.t).toBeGreaterThanOrEqual(0.05);
      expect(leaf.t).toBeLessThanOrEqual(0.95);
    }
  });

  it('keeps every leaf side in {-1, +1}', () => {
    const configs = generateBushConfigs(buildInput({ nRoses: 19 }));
    const leaves = collectAllLeaves(configs);
    expect(leaves.length).toBeGreaterThan(0);
    for (const leaf of leaves) {
      expect(leaf.side === -1 || leaf.side === 1).toBe(true);
    }
  });

  it('keeps every leaf tilt within +/- pi/9 of zero', () => {
    const configs = generateBushConfigs(buildInput({ nRoses: 19 }));
    const leaves = collectAllLeaves(configs);
    for (const leaf of leaves) {
      expect(leaf.tilt).toBeGreaterThanOrEqual(-Math.PI / 9);
      expect(leaf.tilt).toBeLessThanOrEqual(Math.PI / 9);
    }
  });

  it('keeps every leaf variant in {0, 1, 2, 3}', () => {
    const configs = generateBushConfigs(buildInput({ nRoses: 19 }));
    const leaves = collectAllLeaves(configs);
    for (const leaf of leaves) {
      const ok = leaf.variant === 0 || leaf.variant === 1 || leaf.variant === 2 || leaf.variant === 3;
      expect(ok).toBe(true);
    }
  });

  it('places every stem control point on the outer side of the base->top line', () => {
    const configs = generateBushConfigs(buildInput({ nRoses: 19 }));
    for (const bush of configs) {
      const bushBase = { x: bush.baseX, y: bush.baseY };
      for (const stem of bush.stems) {
        const baseToTopX = stem.topX - stem.baseX;
        const baseToTopY = stem.topY - stem.baseY;
        const baseToBushX = bushBase.x - stem.baseX;
        const baseToBushY = bushBase.y - stem.baseY;
        const bushCross = baseToTopX * baseToBushY - baseToTopY * baseToBushX;
        const controlCross =
          baseToTopX * (stem.controlY - stem.baseY) -
          baseToTopY * (stem.controlX - stem.baseX);
        if (Math.abs(controlCross) < 1e-9) continue;
        if (Math.abs(bushCross) < 1e-9) {
          expect(Math.abs(controlCross)).toBeGreaterThan(0);
          continue;
        }
        expect(Math.sign(controlCross)).toBe(-Math.sign(bushCross));
      }
    }
  });

  it('produces identical output for the same seed', () => {
    const a = generateBushConfigs(buildInput({ rng: createRng(7) }));
    const b = generateBushConfigs(buildInput({ rng: createRng(7) }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('produces a different but still valid output for a different seed', () => {
    const a = generateBushConfigs(buildInput({ rng: createRng(7) }));
    const b = generateBushConfigs(buildInput({ rng: createRng(8) }));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    const min = Math.ceil(19 / 6);
    const max = Math.ceil(19 / 4);
    expect(b.length).toBeGreaterThanOrEqual(min);
    expect(b.length).toBeLessThanOrEqual(max);
    expect(collectAllStems(b).length).toBe(19);
  });

  it('respects leavesPerStemRange when picking leaf counts', () => {
    const configs = generateBushConfigs(
      buildInput({ nRoses: 19, leavesPerStemRange: [6, 6] }),
    );
    const leaves = collectAllLeaves(configs);
    expect(leaves.length).toBe(19 * 6);
  });

  it('assigns one distinct tint to each bush and that tint to every stem in the bush', () => {
    const configs = generateBushConfigs(buildInput({ nRoses: 19 }));
    const tints = configs.map(b => b.tint);
    expect(new Set(tints).size).toBe(configs.length);
    for (const bush of configs) {
      expect(bush.stems.length).toBeGreaterThan(0);
      expect(bush.tint).toBe(tints[bush.bushId]);
    }
  });
});

describe('validateBushConfigs (exported validation)', () => {
  it('throws on a leaf with t outside [0.05, 0.95]', () => {
    const { validateBushConfigs } = require('../generateBushConfigs');
    const input = buildInput({ nRoses: 1, rng: createRng(1) });
    const badConfigs = [
      {
        bushId: 0,
        baseX: GROUND_BAND.x,
        baseY: GROUND_BAND.y,
        tint: [0.95, 0.18, 0.22],
        stems: [
          {
            roseIndex: 0,
            baseX: GROUND_BAND.x,
            baseY: GROUND_BAND.y,
            topX: 100,
            topY: 100,
            controlX: 50,
            controlY: 50,
            baseWidth: 3,
            topWidth: 18,
            leaves: [{ t: 1.5, side: 1, tilt: 0, variant: 0, size: 24 }],
          },
        ],
      },
    ];
    expect(() => validateBushConfigs(badConfigs, input)).toThrow(/leaf t/);
  });

  it('throws when a rose index is not assigned', () => {
    const { validateBushConfigs } = require('../generateBushConfigs');
    const input = buildInput({ nRoses: 2, rng: createRng(1) });
    const badConfigs = [
      {
        bushId: 0,
        baseX: GROUND_BAND.x,
        baseY: GROUND_BAND.y,
        tint: [0.95, 0.18, 0.22],
        stems: [
          {
            roseIndex: 0,
            baseX: GROUND_BAND.x,
            baseY: GROUND_BAND.y,
            topX: 100,
            topY: 100,
            controlX: 50,
            controlY: 50,
            baseWidth: 3,
            topWidth: 18,
            leaves: [],
          },
        ],
      },
    ];
    expect(() => validateBushConfigs(badConfigs, input)).toThrow(/expected 2 unique roses, got 1/);
  });
});
