import {
  planFlowerGardenMatchStems,
  STEM_ANCHOR_MARGIN,
} from '../planFlowerGardenMatchStems';

const SCREEN_W = 390;
const SCREEN_H = 844;

describe('planFlowerGardenMatchStems', () => {
  it('produces one bush per rose', () => {
    const plans = planFlowerGardenMatchStems({
      seedKey: 'match-stems:1',
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
      roses: [
        { index: 0, x: 100, y: 160, side: 'top' },
        { index: 1, x: 200, y: 160, side: 'top' },
        { index: 2, x: 120, y: 680, side: 'bottom' },
        { index: 3, x: 240, y: 680, side: 'bottom' },
      ],
    });
    expect(plans).toHaveLength(4);
  });

  it('anchors top roses above the screen and bottom roses below it', () => {
    const plans = planFlowerGardenMatchStems({
      seedKey: 'match-stems:2',
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
      roses: [
        { index: 0, x: 100, y: 160, side: 'top' },
        { index: 1, x: 200, y: 680, side: 'bottom' },
      ],
    });
    expect(plans[0]!.baseY).toBe(-STEM_ANCHOR_MARGIN);
    expect(plans[1]!.baseY).toBe(SCREEN_H + STEM_ANCHOR_MARGIN);
  });

  it('uses thick-ground / thin-rose widths for bottom stems and the reverse for top stems', () => {
    const plans = planFlowerGardenMatchStems({
      seedKey: 'match-stems:3',
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
      roses: [
        { index: 0, x: 100, y: 160, side: 'top' },
        { index: 1, x: 200, y: 680, side: 'bottom' },
      ],
    });
    const topStem = plans[0]!.stems[0]!;
    const bottomStem = plans[1]!.stems[0]!;
    expect(topStem.baseWidth).toBeLessThan(topStem.topWidth);
    expect(bottomStem.baseWidth).toBeGreaterThan(bottomStem.topWidth);
  });

  it('targets the rose center as the stem top', () => {
    const plans = planFlowerGardenMatchStems({
      seedKey: 'match-stems:4',
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
      roses: [{ index: 5, x: 123, y: 456, side: 'bottom' }],
    });
    expect(plans[0]!.stems[0]!.topX).toBe(123);
    expect(plans[0]!.stems[0]!.topY).toBe(456);
    expect(plans[0]!.stems[0]!.roseIndex).toBe(5);
  });

  it('is deterministic for the same seed', () => {
    const input = {
      seedKey: 'match-stems:5',
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
      roses: [
        { index: 0, x: 100, y: 160, side: 'top' },
        { index: 1, x: 200, y: 680, side: 'bottom' },
      ],
    } as const;
    const a = planFlowerGardenMatchStems(input);
    const b = planFlowerGardenMatchStems(input);
    expect(a).toEqual(b);
  });
});
