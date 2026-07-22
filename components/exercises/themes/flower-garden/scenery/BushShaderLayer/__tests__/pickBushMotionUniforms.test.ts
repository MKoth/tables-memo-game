import type { BushConfig, LeafConfig } from '../types';
import { MAX_STEMS_PER_BUSH, MAX_LEAVES_PER_STEM } from '../types';
import { roseBushUniformDefaults } from '../../../shaders/roseBush.sksl';
import { pickBushMotionUniforms } from '../pickBushMotionUniforms';
import { bezierPoint } from '../helpers/bezierMath';

function makeLeaf(t: number, side: 1 | -1, variant: 0 | 1 | 2 | 3 = 0): LeafConfig {
  return { t, side, tilt: 0, variant, size: 24 };
}

function makeBush(stems: BushConfig['stems']): BushConfig {
  return { bushId: 0, baseX: 50, baseY: 620, tint: [1, 0, 0], stems };
}

describe('pickBushMotionUniforms', () => {
  it('copies stem base/control/width constants from the bush config', () => {
    const bush = makeBush([
      {
        roseIndex: 7,
        baseX: 55,
        baseY: 625,
        topX: 100,
        topY: 300,
        controlX: 60,
        controlY: 460,
        baseWidth: 3,
        topWidth: 18,
        leaves: [makeLeaf(0.2, 1), makeLeaf(0.5, -1), makeLeaf(0.8, 1, 1)],
      },
      {
        roseIndex: 12,
        baseX: 45,
        baseY: 615,
        topX: 220,
        topY: 320,
        controlX: 240,
        controlY: 470,
        baseWidth: 3,
        topWidth: 18,
        leaves: [makeLeaf(0.3, -1, 2), makeLeaf(0.7, 1, 3)],
      },
    ]);
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, layout, roseBellSizes);

    expect(result.stemBaseX.slice(0, 2)).toEqual([55, 45]);
    expect(result.stemBaseY.slice(0, 2)).toEqual([625, 615]);
    expect(result.stemControlX.slice(0, 2)).toEqual([60, 240]);
    expect(result.stemControlY.slice(0, 2)).toEqual([460, 470]);
    expect(result.stemBaseWidth.slice(0, 2)).toEqual([3, 3]);
    expect(result.stemTopWidth.slice(0, 2)).toEqual([18, 18]);
  });

  it('exposes rest positions from stem.topX/topY as restX/restY', () => {
    const bush = makeBush([
      {
        roseIndex: 7,
        baseX: 55,
        baseY: 625,
        topX: 100,
        topY: 300,
        controlX: 60,
        controlY: 460,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
      {
        roseIndex: 12,
        baseX: 45,
        baseY: 615,
        topX: 220,
        topY: 320,
        controlX: 240,
        controlY: 470,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
    ]);
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 999, 0, 0, 0, 0, 999],
      y: [0, 0, 0, 0, 0, 0, 0, 999, 0, 0, 0, 0, 999],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, layout, roseBellSizes);

    expect(result.restX.slice(0, 2)).toEqual([100, 220]);
    expect(result.restY.slice(0, 2)).toEqual([300, 320]);
  });

  it('reads the rose live position from the layout at the bridge index', () => {
    const bush = makeBush([
      {
        roseIndex: 7,
        baseX: 55,
        baseY: 625,
        topX: 100,
        topY: 300,
        controlX: 60,
        controlY: 460,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
      {
        roseIndex: 12,
        baseX: 45,
        baseY: 615,
        topX: 220,
        topY: 320,
        controlX: 240,
        controlY: 470,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
    ]);
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, layout, roseBellSizes);

    expect(result.layoutX.slice(0, 2)).toEqual([100, 220]);
    expect(result.layoutY.slice(0, 2)).toEqual([300, 320]);
    expect(result.layoutScale.slice(0, 2)).toEqual([1, 1]);
  });

  it('reads the live layout entry for a header cell at a small bridge index', () => {
    const bush = makeBush([
      {
        roseIndex: 0,
        baseX: 55,
        baseY: 625,
        topX: 100,
        topY: 300,
        controlX: 60,
        controlY: 460,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
      {
        roseIndex: 1,
        baseX: 45,
        baseY: 615,
        topX: 220,
        topY: 320,
        controlX: 240,
        controlY: 470,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
    ]);
    const layout = {
      x: [50, 250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      y: [80, 90, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      scale: [0.7, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [40, 50];

    const result = pickBushMotionUniforms(bush, layout, roseBellSizes);

    expect(result.layoutX.slice(0, 2)).toEqual([50, 250]);
    expect(result.layoutY.slice(0, 2)).toEqual([80, 90]);
    expect(result.layoutScale.slice(0, 2)).toEqual([0.7, 0.9]);
    expect(result.stemCalyxSize[0]).toBeCloseTo(40 * roseBushUniformDefaults.calyxSizeFraction);
    expect(result.stemCalyxSize[1]).toBeCloseTo(50 * roseBushUniformDefaults.calyxSizeFraction);
  });

  it('computes the per-stem calyx base size as bellSize * calyxSizeFraction (shader multiplies by layoutScale)', () => {
    const bush = makeBush([
      {
        roseIndex: 7,
        baseX: 55,
        baseY: 625,
        topX: 100,
        topY: 300,
        controlX: 60,
        controlY: 460,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
      {
        roseIndex: 12,
        baseX: 45,
        baseY: 615,
        topX: 220,
        topY: 320,
        controlX: 240,
        controlY: 470,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
    ]);
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1.5, 1, 1, 1, 1, 2.0],
    };
    const roseBellSizes: number[] = [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 80];

    const result = pickBushMotionUniforms(bush, layout, roseBellSizes);

    const expected0 = 100 * roseBushUniformDefaults.calyxSizeFraction;
    const expected1 = 80 * roseBushUniformDefaults.calyxSizeFraction;
    expect(result.stemCalyxSize[0]).toBeCloseTo(expected0);
    expect(result.stemCalyxSize[1]).toBeCloseTo(expected1);
  });

  it('updates layout uniforms when the layout moves but rest uniforms stay the same', () => {
    const bush = makeBush([
      {
        roseIndex: 7,
        baseX: 55,
        baseY: 625,
        topX: 100,
        topY: 300,
        controlX: 60,
        controlY: 460,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
      {
        roseIndex: 12,
        baseX: 45,
        baseY: 615,
        topX: 220,
        topY: 320,
        controlX: 240,
        controlY: 470,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
    ]);
    const beforeLayout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1.0, 1, 1, 1, 1, 1.0],
    };
    const afterLayout = {
      x: [0, 0, 0, 0, 0, 0, 0, 130, 0, 0, 0, 0, 250],
      y: [0, 0, 0, 0, 0, 0, 0, 280, 0, 0, 0, 0, 300],
      scale: [1, 1, 1, 1, 1, 1, 1, 1.1, 1, 1, 1, 1, 0.9],
    };
    const roseBellSizes: number[] = [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 80];

    const before = pickBushMotionUniforms(bush, beforeLayout, roseBellSizes);
    const after = pickBushMotionUniforms(bush, afterLayout, roseBellSizes);

    expect(after.restX.slice(0, 2)).toEqual(before.restX.slice(0, 2));
    expect(after.restY.slice(0, 2)).toEqual(before.restY.slice(0, 2));
    expect(after.layoutX.slice(0, 2)).not.toEqual(before.layoutX.slice(0, 2));
    expect(after.layoutY.slice(0, 2)).not.toEqual(before.layoutY.slice(0, 2));
    expect(after.layoutScale.slice(0, 2)).not.toEqual(before.layoutScale.slice(0, 2));
  });

  it('pads stem arrays to MAX_STEMS_PER_BUSH with zeros', () => {
    const bush = makeBush([
      {
        roseIndex: 7,
        baseX: 55,
        baseY: 625,
        topX: 100,
        topY: 300,
        controlX: 60,
        controlY: 460,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
      {
        roseIndex: 12,
        baseX: 45,
        baseY: 615,
        topX: 220,
        topY: 320,
        controlX: 240,
        controlY: 470,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
    ]);
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, layout, roseBellSizes);

    for (const key of [
      'stemBaseX',
      'stemBaseY',
      'stemControlX',
      'stemControlY',
      'stemBaseWidth',
      'stemTopWidth',
      'stemCalyxSize',
      'restX',
      'restY',
      'layoutX',
      'layoutY',
      'layoutScale',
    ] as const) {
      expect((result[key] as number[]).length).toBe(MAX_STEMS_PER_BUSH);
    }
    for (let i = 2; i < MAX_STEMS_PER_BUSH; i++) {
      expect(result.stemBaseX[i]).toBe(0);
      expect(result.stemBaseY[i]).toBe(0);
      expect(result.restX[i]).toBe(0);
      expect(result.restY[i]).toBe(0);
      expect(result.layoutX[i]).toBe(0);
      expect(result.layoutY[i]).toBe(0);
      expect(result.layoutScale[i]).toBe(0);
    }
  });

  it('flattens the leaves into the LEAF_SLOTS arrays preserving per-stem order', () => {
    const bush = makeBush([
      {
        roseIndex: 7,
        baseX: 55,
        baseY: 625,
        topX: 100,
        topY: 300,
        controlX: 60,
        controlY: 460,
        baseWidth: 3,
        topWidth: 18,
        leaves: [makeLeaf(0.2, 1), makeLeaf(0.5, -1), makeLeaf(0.8, 1, 1)],
      },
      {
        roseIndex: 12,
        baseX: 45,
        baseY: 615,
        topX: 220,
        topY: 320,
        controlX: 240,
        controlY: 470,
        baseWidth: 3,
        topWidth: 18,
        leaves: [makeLeaf(0.3, -1, 2), makeLeaf(0.7, 1, 3)],
      },
    ]);
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, layout, roseBellSizes);

    const expectedLeafCount = bush.stems[0]!.leaves.length + bush.stems[1]!.leaves.length;
    const leafTNonZero = (result.leafT as number[]).filter(v => v !== 0).length;
    expect(leafTNonZero).toBe(expectedLeafCount);
    expect(result.leafT.length).toBe(MAX_STEMS_PER_BUSH * MAX_LEAVES_PER_STEM);
  });

  it('sets stemCount to the number of stems in the bush', () => {
    const bush = makeBush([
      {
        roseIndex: 7,
        baseX: 55,
        baseY: 625,
        topX: 100,
        topY: 300,
        controlX: 60,
        controlY: 460,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
      {
        roseIndex: 12,
        baseX: 45,
        baseY: 615,
        topX: 220,
        topY: 320,
        controlX: 240,
        controlY: 470,
        baseWidth: 3,
        topWidth: 18,
        leaves: [],
      },
    ]);
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, layout, roseBellSizes);

    expect(result.stemCount).toBe(bush.stems.length);
  });

  it('records the per-stem leaf count in stemLeafCount', () => {
    const bush = makeBush([
      {
        roseIndex: 7,
        baseX: 55,
        baseY: 625,
        topX: 100,
        topY: 300,
        controlX: 60,
        controlY: 460,
        baseWidth: 3,
        topWidth: 18,
        leaves: [makeLeaf(0.2, 1), makeLeaf(0.5, -1), makeLeaf(0.8, 1, 1)],
      },
      {
        roseIndex: 12,
        baseX: 45,
        baseY: 615,
        topX: 220,
        topY: 320,
        controlX: 240,
        controlY: 470,
        baseWidth: 3,
        topWidth: 18,
        leaves: [makeLeaf(0.3, -1, 2), makeLeaf(0.7, 1, 3)],
      },
    ]);
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, layout, roseBellSizes);

    expect(result.stemLeafCount.slice(0, 2)).toEqual([3, 2]);
  });

  it('packs the per-leaf rest attachment into leafRestX/Y for the bbox prefilter', () => {
    const bush = makeBush([
      {
        roseIndex: 7,
        baseX: 55,
        baseY: 625,
        topX: 100,
        topY: 300,
        controlX: 60,
        controlY: 460,
        baseWidth: 3,
        topWidth: 18,
        leaves: [makeLeaf(0.25, 1), makeLeaf(0.75, -1)],
      },
      {
        roseIndex: 12,
        baseX: 45,
        baseY: 615,
        topX: 220,
        topY: 320,
        controlX: 240,
        controlY: 470,
        baseWidth: 3,
        topWidth: 18,
        leaves: [makeLeaf(0.5, 1, 2)],
      },
    ]);
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 999, 0, 0, 0, 0, 999],
      y: [0, 0, 0, 0, 0, 0, 0, 999, 0, 0, 0, 0, 999],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, layout, roseBellSizes);

    const base0 = { x: 55, y: 625 };
    const control0 = { x: 60, y: 460 };
    const top0 = { x: 100, y: 300 };
    const base1 = { x: 45, y: 615 };
    const control1 = { x: 240, y: 470 };
    const top1 = { x: 220, y: 320 };
    const expected = [
      bezierPoint(0.25, base0, control0, top0),
      bezierPoint(0.75, base0, control0, top0),
      bezierPoint(0.5, base1, control1, top1),
    ];
    const leafRestX = result.leafRestX.slice(0, 3);
    const leafRestY = result.leafRestY.slice(0, 3);
    expect(leafRestX[0]).toBeCloseTo(expected[0]!.x);
    expect(leafRestY[0]).toBeCloseTo(expected[0]!.y);
    expect(leafRestX[1]).toBeCloseTo(expected[1]!.x);
    expect(leafRestY[1]).toBeCloseTo(expected[1]!.y);
    expect(leafRestX[2]).toBeCloseTo(expected[2]!.x);
    expect(leafRestY[2]).toBeCloseTo(expected[2]!.y);
  });
});
