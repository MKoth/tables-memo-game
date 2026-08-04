import type { BushConfig } from '../../BushShaderLayer/types';
import { singleStemShadowDefaults } from '../../../shaders/singleStemShadow.sksl';
import { roseShadowDefaults } from '../../../shaders/singleRoseShadow.sksl';
import {
  pickRoseShadowBasePositions,
  pickRoseShadowRect,
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
      controlX: (100 + 80) / 2,
      controlY: (600 + 300) / 2,
      baseWidth: 3 * scale,
      topWidth: 18 * scale,
      roseIndex: 5,
      leaves: [],
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

  it('passes the stem control point through to the slot', () => {
    const bushes = [
      makeBush(0, 0, 0, [
        { baseX: 100, baseY: 600, topX: 80, topY: 300, baseWidth: 3, topWidth: 18, roseIndex: 0 },
      ]),
    ];
    const slots = pickStemList(bushes, undefined);
    expect(slots[0]?.controlX).toBe(90);
    expect(slots[0]?.controlY).toBe(450);
  });

  it('emits an empty leaves array when a stem has no leaves', () => {
    const bushes = [
      makeBush(0, 0, 0, [
        { baseX: 0, baseY: 0, topX: 0, topY: 0, baseWidth: 3, topWidth: 18, roseIndex: 0 },
      ]),
    ];
    const slots = pickStemList(bushes, undefined);
    expect(slots[0]?.leaves).toEqual([]);
  });

  it('passes each stem\'s leaves through as { t, size }', () => {
    const bush: BushConfig = {
      bushId: 0,
      baseX: 0,
      baseY: 0,
      tint: [1, 0, 0],
      stems: [
        {
          roseIndex: 0,
          baseX: 100,
          baseY: 600,
          topX: 80,
          topY: 300,
          controlX: 90,
          controlY: 450,
          baseWidth: 3,
          topWidth: 18,
          leaves: [
            { t: 0.2, side: -1, tilt: 0.1, variant: 0, size: 25 },
            { t: 0.55, side: 1, tilt: -0.05, variant: 2, size: 30 },
            { t: 0.8, side: -1, tilt: 0.2, variant: 1, size: 20 },
          ],
        },
      ],
    };
    const slots = pickStemList([bush], undefined);
    expect(slots[0]?.leaves).toEqual([
      { t: 0.2, size: 25 },
      { t: 0.55, size: 30 },
      { t: 0.8, size: 20 },
    ]);
  });
});

describe('pickRoseShadowBasePositions', () => {
  it('returns the stem base for each rose, indexed by roseIndex, unpadded', () => {
    const bushes = [
      makeBush(0, 0, 0, [
        { baseX: 88, baseY: 612, topX: 0, topY: 0, baseWidth: 3, topWidth: 18, roseIndex: 5 },
        { baseX: 112, baseY: 590, topX: 0, topY: 0, baseWidth: 3, topWidth: 18, roseIndex: 0 },
      ]),
    ];
    const bases = pickRoseShadowBasePositions(bushes, 6);
    expect(bases).toHaveLength(12);
    expect(bases[0]).toBe(112);
    expect(bases[1]).toBe(590);
    expect(bases[10]).toBe(88);
    expect(bases[11]).toBe(612);
    for (let i = 2; i < 10; i++) {
      expect(bases[i]).toBe(0);
    }
  });

  it('emits two entries per rose without a cap', () => {
    const bases = pickRoseShadowBasePositions([], 70);
    expect(bases).toHaveLength(140);
    expect(bases.every(v => v === 0)).toBe(true);
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

  it('includes unpadded roseShadowBase positions from the bush config', () => {
    const bushes = [
      makeBush(0, 0, 0, [
        { baseX: 50, baseY: 650, topX: 0, topY: 0, baseWidth: 3, topWidth: 18, roseIndex: 0 },
        { baseX: 70, baseY: 630, topX: 0, topY: 0, baseWidth: 3, topWidth: 18, roseIndex: 1 },
      ]),
    ];
    const u = pickRoseStaticUniforms(undefined, bushes, 2);
    expect(u.roseShadowBase).toEqual([50, 650, 70, 630]);
  });
});

describe('pickRoseShadowRect', () => {
  const style = {
    lightOffset: [3, 5] as [number, number],
    stemShadowTopSkew: 0.2,
    shadowSquash: 1.0,
  };

  it('centers the rect on mix(center + lightOffset, base, skew)', () => {
    const g = pickRoseShadowRect(100, 200, 50, 650, 30, style);
    const cx = (100 + 3) * 0.8 + 50 * 0.2;
    const cy = (200 + 5) * 0.8 + 650 * 0.2;
    expect(g.x).toBeCloseTo(cx - 32);
    expect(g.y).toBeCloseTo(cy - 32);
    expect(g.width).toBeCloseTo(64);
    expect(g.height).toBeCloseTo(64);
  });

  it('centers on center + lightOffset when skew is 0', () => {
    const g = pickRoseShadowRect(100, 200, 50, 650, 30, { ...style, stemShadowTopSkew: 0 });
    expect(g.x).toBeCloseTo(103 - 32);
    expect(g.y).toBeCloseTo(205 - 32);
  });

  it('centers on the base when skew is 1', () => {
    const g = pickRoseShadowRect(100, 200, 50, 650, 30, { ...style, stemShadowTopSkew: 1 });
    expect(g.x).toBeCloseTo(50 - 32);
    expect(g.y).toBeCloseTo(650 - 32);
  });

  it('squashes the y semi-axis by shadowSquash and pads both axes by the epsilon', () => {
    const g = pickRoseShadowRect(100, 200, 50, 650, 40, { ...style, shadowSquash: 0.5 });
    expect(g.width).toBeCloseTo(84);
    expect(g.height).toBeCloseTo(44);
  });

  it('keeps a non-zero rect for radius 0', () => {
    const g = pickRoseShadowRect(0, 0, 0, 0, 0, style);
    expect(g.x).toBeCloseTo((0 + 3) * 0.8 - 2);
    expect(g.y).toBeCloseTo((0 + 5) * 0.8 - 2);
    expect(g.width).toBe(4);
    expect(g.height).toBe(4);
  });
});
