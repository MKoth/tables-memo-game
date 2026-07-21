import type { BushConfig, LeafConfig } from '../types';
import { MAX_STEMS_PER_BUSH, MAX_LEAVES_PER_STEM } from '../types';
import { roseBushUniformDefaults } from '../../../shaders/roseBush.sksl';
import { pickBushMotionUniforms } from '../pickBushMotionUniforms';

function makeLeaf(t: number, side: 1 | -1, variant: 0 | 1 | 2 | 3 = 0): LeafConfig {
  return { t, side, tilt: 0, variant, size: 24 };
}

function makeBush(): BushConfig {
  return {
    bushId: 0,
    baseX: 50,
    baseY: 620,
    stems: [
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
    ],
  };
}

describe('pickBushMotionUniforms', () => {
  it('copies stem base/control/width constants from the bush config', () => {
    const bush = makeBush();
    const bodyCellIndices = [7, 12];
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, bodyCellIndices, layout, roseBellSizes);

    expect(result.stemBaseX.slice(0, 2)).toEqual([55, 45]);
    expect(result.stemBaseY.slice(0, 2)).toEqual([625, 615]);
    expect(result.stemControlX.slice(0, 2)).toEqual([60, 240]);
    expect(result.stemControlY.slice(0, 2)).toEqual([460, 470]);
    expect(result.stemBaseWidth.slice(0, 2)).toEqual([3, 3]);
    expect(result.stemTopWidth.slice(0, 2)).toEqual([18, 18]);
  });

  it('exposes rest positions from stem.topX/topY as restX/restY', () => {
    const bush = makeBush();
    const bodyCellIndices = [7, 12];
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 999, 0, 0, 0, 0, 999],
      y: [0, 0, 0, 0, 0, 0, 0, 999, 0, 0, 0, 0, 999],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, bodyCellIndices, layout, roseBellSizes);

    expect(result.restX.slice(0, 2)).toEqual([100, 220]);
    expect(result.restY.slice(0, 2)).toEqual([300, 320]);
  });

  it('reads the rose live position from layout via bodyCellIndices', () => {
    const bush = makeBush();
    const bodyCellIndices = [7, 12];
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, bodyCellIndices, layout, roseBellSizes);

    expect(result.layoutX.slice(0, 2)).toEqual([100, 220]);
    expect(result.layoutY.slice(0, 2)).toEqual([300, 320]);
    expect(result.layoutScale.slice(0, 2)).toEqual([1, 1]);
  });

  it('remaps stem.roseIndex through bodyCellIndices to look up the live layout entry', () => {
    const bush = makeBush();
    const bodyCellIndices = [0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 13];
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1.2, 1, 1, 1, 1, 0.8],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, bodyCellIndices, layout, roseBellSizes);

    expect(result.layoutX.slice(0, 2)).toEqual([100, 220]);
    expect(result.layoutY.slice(0, 2)).toEqual([300, 320]);
    expect(result.layoutScale.slice(0, 2)).toEqual([1.2, 0.8]);
  });

  it('computes the per-stem calyx base size as bellSize * calyxSizeFraction (shader multiplies by layoutScale)', () => {
    const bush = makeBush();
    const bodyCellIndices = [7, 12];
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1.5, 1, 1, 1, 1, 2.0],
    };
    const roseBellSizes: number[] = [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 80];

    const result = pickBushMotionUniforms(bush, bodyCellIndices, layout, roseBellSizes);

    const expected0 = 100 * roseBushUniformDefaults.calyxSizeFraction;
    const expected1 = 80 * roseBushUniformDefaults.calyxSizeFraction;
    expect(result.stemCalyxSize[0]).toBeCloseTo(expected0);
    expect(result.stemCalyxSize[1]).toBeCloseTo(expected1);
  });

  it('updates layout uniforms when the layout moves but rest uniforms stay the same', () => {
    const bush = makeBush();
    const bodyCellIndices = [7, 12];
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

    const before = pickBushMotionUniforms(bush, bodyCellIndices, beforeLayout, roseBellSizes);
    const after = pickBushMotionUniforms(bush, bodyCellIndices, afterLayout, roseBellSizes);

    expect(after.restX.slice(0, 2)).toEqual(before.restX.slice(0, 2));
    expect(after.restY.slice(0, 2)).toEqual(before.restY.slice(0, 2));
    expect(after.layoutX.slice(0, 2)).not.toEqual(before.layoutX.slice(0, 2));
    expect(after.layoutY.slice(0, 2)).not.toEqual(before.layoutY.slice(0, 2));
    expect(after.layoutScale.slice(0, 2)).not.toEqual(before.layoutScale.slice(0, 2));
  });

  it('pads stem arrays to MAX_STEMS_PER_BUSH with zeros', () => {
    const bush = makeBush();
    const bodyCellIndices = [7, 12];
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, bodyCellIndices, layout, roseBellSizes);

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
    const bush = makeBush();
    const bodyCellIndices = [7, 12];
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, bodyCellIndices, layout, roseBellSizes);

    const expectedLeafCount = bush.stems[0]!.leaves.length + bush.stems[1]!.leaves.length;
    const leafTNonZero = (result.leafT as number[]).filter(v => v !== 0).length;
    expect(leafTNonZero).toBe(expectedLeafCount);
    expect(result.leafT.length).toBe(MAX_STEMS_PER_BUSH * MAX_LEAVES_PER_STEM);
  });

  it('sets stemCount to the number of stems in the bush', () => {
    const bush = makeBush();
    const bodyCellIndices = [7, 12];
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, bodyCellIndices, layout, roseBellSizes);

    expect(result.stemCount).toBe(bush.stems.length);
  });

  it('records the per-stem leaf count in stemLeafCount', () => {
    const bush = makeBush();
    const bodyCellIndices = [7, 12];
    const layout = {
      x: [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 220],
      y: [0, 0, 0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 320],
      scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const roseBellSizes: number[] = [];

    const result = pickBushMotionUniforms(bush, bodyCellIndices, layout, roseBellSizes);

    expect(result.stemLeafCount.slice(0, 2)).toEqual([3, 2]);
  });
});
