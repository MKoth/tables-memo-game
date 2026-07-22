import type { BushConfig } from '../../BushShaderLayer/types';
import { singleStemShadowDefaults } from '../../../shaders/singleStemShadow.sksl';
import { roseShadowDefaults } from '../../../shaders/roseShadows.sksl';
import {
  pickRoseMotionUniforms,
  pickRoseShadowBasePositions,
  pickRoseStaticUniforms,
  pickStemList,
  resolveSceneryShadowStyle,
} from '../pickSceneryShadowUniforms';

function makeBush(
  bushId: number,
  baseX: number,
  baseY: number,
  stems: ReadonlyArray<{
    baseX: number;
    baseY: number;
    topX: number;
    topY: number;
    baseWidth: number;
    topWidth: number;
    roseIndex: number;
  }>,
): BushConfig {
  return {
    bushId,
    baseX,
    baseY,
    tint: [1, 0, 0],
    stems: stems.map(s => ({
      roseIndex: s.roseIndex,
      baseX: s.baseX,
      baseY: s.baseY,
      topX: s.topX,
      topY: s.topY,
      controlX: (s.baseX + s.topX) / 2,
      controlY: (s.baseY + s.topY) / 2,
      baseWidth: s.baseWidth,
      topWidth: s.topWidth,
      leaves: [],
    })),
  };
}

describe('resolveSceneryShadowStyle', () => {
  it('returns singleStemShadowDefaults + roseShadowDefaults.roseRadiusFraction when no style is provided', () => {
    const s = resolveSceneryShadowStyle(undefined);
    expect(s.lightOffset).toEqual(singleStemShadowDefaults.lightOffset);
    expect(s.shadowColor).toEqual(singleStemShadowDefaults.shadowColor);
    expect(s.shadowOpacity).toBe(singleStemShadowDefaults.shadowOpacity);
    expect(s.shadowSoftness).toBe(singleStemShadowDefaults.shadowSoftness);
    expect(s.roseRadiusFraction).toBe(roseShadowDefaults.roseRadiusFraction);
    expect(s.stemShadowWidthScale).toBe(
      singleStemShadowDefaults.stemShadowWidthScale,
    );
    expect(s.stemShadowTopSkew).toBe(singleStemShadowDefaults.stemShadowTopSkew);
    expect(s.stemShadowTopBlur).toBe(singleStemShadowDefaults.stemShadowTopBlur);
  });

  it('overrides only the provided fields', () => {
    const s = resolveSceneryShadowStyle({
      shadowOpacity: 0.5,
      lightOffset: [10, 20],
      stemShadowWidthScale: 0.5,
      stemShadowTopSkew: 0.35,
      stemShadowTopBlur: 0.4,
      roseRadiusFraction: 0.7,
    });
    expect(s.shadowOpacity).toBe(0.5);
    expect(s.lightOffset).toEqual([10, 20]);
    expect(s.stemShadowWidthScale).toBe(0.5);
    expect(s.stemShadowTopSkew).toBe(0.35);
    expect(s.stemShadowTopBlur).toBe(0.4);
    expect(s.roseRadiusFraction).toBe(0.7);
    expect(s.shadowColor).toEqual(singleStemShadowDefaults.shadowColor);
    expect(s.shadowSoftness).toBe(singleStemShadowDefaults.shadowSoftness);
  });
});

describe('pickStemList', () => {
  it('emits one slot per stem with per-stem base/top/width/roseIndex', () => {
    const scale = singleStemShadowDefaults.stemShadowWidthScale;
    const bushes = [
      makeBush(0, 100, 600, [
        { baseX: 100, baseY: 600, topX: 80, topY: 300, baseWidth: 3, topWidth: 18, roseIndex: 5 },
        { baseX: 105, baseY: 605, topX: 130, topY: 320, baseWidth: 4, topWidth: 20, roseIndex: 7 },
      ]),
      makeBush(1, 200, 620, [
        { baseX: 200, baseY: 620, topX: 180, topY: 280, baseWidth: 3, topWidth: 18, roseIndex: 9 },
        { baseX: 198, baseY: 622, topX: 220, topY: 340, baseWidth: 3, topWidth: 18, roseIndex: 11 },
        { baseX: 202, baseY: 618, topX: 250, topY: 360, baseWidth: 3, topWidth: 18, roseIndex: 13 },
      ]),
    ];
    const slots = pickStemList(bushes, undefined);

    expect(slots).toHaveLength(5);
    expect(slots[0]).toEqual({
      baseX: 100,
      baseY: 600,
      topX: 80,
      topY: 300,
      baseWidth: 3 * scale,
      topWidth: 18 * scale,
      roseIndex: 5,
    });
    expect(slots[1]?.roseIndex).toBe(7);
    expect(slots[2]?.roseIndex).toBe(9);
    expect(slots[3]?.roseIndex).toBe(11);
    expect(slots[4]?.roseIndex).toBe(13);
  });

  it('scales widths by stemShadowWidthScale', () => {
    const bushes = [
      makeBush(0, 0, 0, [
        { baseX: 0, baseY: 0, topX: 0, topY: 0, baseWidth: 10, topWidth: 20, roseIndex: 0 },
      ]),
    ];
    const slots = pickStemList(bushes, { stemShadowWidthScale: 0.5 });
    expect(slots[0]?.baseWidth).toBe(5);
    expect(slots[0]?.topWidth).toBe(10);
  });

  it('returns empty list when no bushes', () => {
    expect(pickStemList([], undefined)).toEqual([]);
  });

  it('uses the stem base, not the bush base', () => {
    const bushes = [
      makeBush(0, 100, 600, [
        { baseX: 88, baseY: 612, topX: 70, topY: 280, baseWidth: 3, topWidth: 18, roseIndex: 0 },
        { baseX: 112, baseY: 590, topX: 140, topY: 310, baseWidth: 3, topWidth: 18, roseIndex: 1 },
      ]),
    ];
    const slots = pickStemList(bushes, undefined);
    expect(slots[0]?.baseX).toBe(88);
    expect(slots[0]?.baseY).toBe(612);
    expect(slots[1]?.baseX).toBe(112);
    expect(slots[1]?.baseY).toBe(590);
  });
});

describe('pickRoseShadowBasePositions', () => {
  it('returns the stem base for each rose, indexed by roseIndex', () => {
    const bushes = [
      makeBush(0, 0, 0, [
        { baseX: 88, baseY: 612, topX: 0, topY: 0, baseWidth: 3, topWidth: 18, roseIndex: 5 },
        { baseX: 112, baseY: 590, topX: 0, topY: 0, baseWidth: 3, topWidth: 18, roseIndex: 0 },
      ]),
    ];
    const bases = pickRoseShadowBasePositions(bushes, 6);
    expect(bases).toHaveLength(64 * 2);
    expect(bases[0]).toBe(112);
    expect(bases[1]).toBe(590);
    expect(bases[10]).toBe(88);
    expect(bases[11]).toBe(612);
    for (let i = 2; i < 10; i++) {
      expect(bases[i]).toBe(0);
    }
    for (let i = 12; i < 64 * 2; i++) {
      expect(bases[i]).toBe(0);
    }
  });

  it('caps at 64 roses', () => {
    const bases = pickRoseShadowBasePositions([], 70);
    expect(bases.filter(v => v !== 0)).toEqual([]);
  });
});

describe('pickRoseStaticUniforms', () => {
  it('passes through style with squash=1.0', () => {
    const u = pickRoseStaticUniforms(undefined, [], 0);
    expect(u.shadowSquash).toBe(1.0);
    expect(u.lightOffset).toEqual(singleStemShadowDefaults.lightOffset);
    expect(u.shadowColor).toEqual(singleStemShadowDefaults.shadowColor);
    expect(u.shadowOpacity).toBe(singleStemShadowDefaults.shadowOpacity);
    expect(u.shadowSoftness).toBe(singleStemShadowDefaults.shadowSoftness);
    expect(u.stemShadowTopSkew).toBe(
      singleStemShadowDefaults.stemShadowTopSkew,
    );
  });

  it('honors style overrides', () => {
    const u = pickRoseStaticUniforms(
      {
        shadowOpacity: 0.6,
        lightOffset: [1, 2],
        shadowColor: [0.1, 0.2, 0.3],
        shadowSoftness: 0.7,
        stemShadowTopSkew: 0.3,
      },
      [],
      0,
    );
    expect(u.shadowOpacity).toBe(0.6);
    expect(u.lightOffset).toEqual([1, 2]);
    expect(u.shadowColor).toEqual([0.1, 0.2, 0.3]);
    expect(u.shadowSoftness).toBe(0.7);
    expect(u.stemShadowTopSkew).toBe(0.3);
    expect(u.shadowSquash).toBe(1.0);
  });

  it('includes roseShadowBase positions from the bush config', () => {
    const bushes = [
      makeBush(0, 0, 0, [
        { baseX: 50, baseY: 650, topX: 0, topY: 0, baseWidth: 3, topWidth: 18, roseIndex: 0 },
        { baseX: 70, baseY: 630, topX: 0, topY: 0, baseWidth: 3, topWidth: 18, roseIndex: 1 },
      ]),
    ];
    const u = pickRoseStaticUniforms(undefined, bushes, 2);
    expect(u.roseShadowBase[0]).toBe(50);
    expect(u.roseShadowBase[1]).toBe(650);
    expect(u.roseShadowBase[2]).toBe(70);
    expect(u.roseShadowBase[3]).toBe(630);
  });
});

describe('pickRoseMotionUniforms', () => {
  it('writes roseShadowCount and zero-pads arrays', () => {
    const layoutX = [10, 20, 30];
    const layoutY = [100, 200, 300];
    const bodySizes = [50, 60, 70];
    const u = pickRoseMotionUniforms(layoutX, layoutY, bodySizes, 0.6);

    expect(u.roseShadowCount).toBe(3);
    expect(u.roseShadowCenter).toHaveLength(64 * 2);
    expect(u.roseShadowRadius).toHaveLength(64);

    expect(u.roseShadowCenter[0]).toBe(10);
    expect(u.roseShadowCenter[1]).toBe(100);
    expect(u.roseShadowCenter[2]).toBe(20);
    expect(u.roseShadowCenter[3]).toBe(200);
    expect(u.roseShadowCenter[4]).toBe(30);
    expect(u.roseShadowCenter[5]).toBe(300);

    expect(u.roseShadowRadius[0]).toBeCloseTo(30);
    expect(u.roseShadowRadius[1]).toBeCloseTo(36);
    expect(u.roseShadowRadius[2]).toBeCloseTo(42);

    for (let i = 3; i < 64; i++) {
      expect(u.roseShadowRadius[i]).toBe(0);
    }
    for (let i = 6; i < 64 * 2; i++) {
      expect(u.roseShadowCenter[i]).toBe(0);
    }
  });

  it('caps count at 64', () => {
    const n = 70;
    const layoutX = Array.from({ length: n }, (_, i) => i);
    const layoutY = Array.from({ length: n }, (_, i) => i);
    const bodySizes = Array.from({ length: n }, () => 40);
    const u = pickRoseMotionUniforms(layoutX, layoutY, bodySizes, 0.6);
    expect(u.roseShadowCount).toBe(64);
  });

  it('uses the shortest input array length as the count', () => {
    const layoutX = [1, 2, 3, 4];
    const layoutY = [5, 6];
    const bodySizes = [10, 20, 30, 40];
    const u = pickRoseMotionUniforms(layoutX, layoutY, bodySizes, 0.6);
    expect(u.roseShadowCount).toBe(2);
    expect(u.roseShadowCenter[0]).toBe(1);
    expect(u.roseShadowCenter[1]).toBe(5);
    expect(u.roseShadowCenter[2]).toBe(2);
    expect(u.roseShadowCenter[3]).toBe(6);
  });

  it('treats missing array entries as zero', () => {
    const u = pickRoseMotionUniforms([], [], [], 0.6);
    expect(u.roseShadowCount).toBe(0);
    expect(u.roseShadowCenter.every(v => v === 0)).toBe(true);
    expect(u.roseShadowRadius.every(v => v === 0)).toBe(true);
  });

  it('scales rose radius by the roseRadiusFraction', () => {
    const u = pickRoseMotionUniforms([0], [0], [100], 0.25);
    expect(u.roseShadowRadius[0]).toBe(25);
  });
});
