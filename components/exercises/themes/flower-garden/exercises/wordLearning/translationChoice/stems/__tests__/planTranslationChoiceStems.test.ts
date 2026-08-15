import {
  planTranslationChoiceStems,
  STEM_ANCHOR_MARGIN,
  STEM_BASE_WIDTH,
  STEM_TOP_WIDTH,
} from '../planTranslationChoiceStems';

const SCREEN = { screenWidth: 800, screenHeight: 600 };

function slotCenters(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    x: 200 + index * 100,
    y: 450,
  }));
}

describe('planTranslationChoiceStems', () => {
  it('returns an empty plan for no slots', () => {
    expect(
      planTranslationChoiceStems({ roundPos: 0, ...SCREEN, slotCenters: [] }),
    ).toEqual([]);
  });

  it('plans one bush per slot with anchors below the screen bottom', () => {
    const plans = planTranslationChoiceStems({
      roundPos: 2,
      ...SCREEN,
      slotCenters: slotCenters(4),
    });

    expect(plans).toHaveLength(4);
    for (const bush of plans) {
      expect(bush.stems).toHaveLength(1);
      const stem = bush.stems[0]!;
      expect(stem.baseY).toBe(SCREEN.screenHeight + STEM_ANCHOR_MARGIN);
      expect(stem.baseX).toBeGreaterThanOrEqual(0);
      expect(stem.baseX).toBeLessThanOrEqual(SCREEN.screenWidth);
      expect(stem.topX).toBeGreaterThan(0);
      expect(stem.topY).toBe(450);
      expect(stem.baseWidth).toBe(STEM_BASE_WIDTH);
      expect(stem.topWidth).toBe(STEM_TOP_WIDTH);
    }
    expect(new Set(plans.map(bush => bush.stems[0]!.roseIndex))).toEqual(
      new Set([0, 1, 2, 3]),
    );
  });

  it('plans 1–3 leaves per stem with valid parameters', () => {
    const plans = planTranslationChoiceStems({
      roundPos: 1,
      ...SCREEN,
      slotCenters: slotCenters(8),
    });

    for (const bush of plans) {
      const leaves = bush.stems[0]!.leaves;
      expect(leaves.length).toBeGreaterThanOrEqual(1);
      expect(leaves.length).toBeLessThanOrEqual(3);
      for (const leaf of leaves) {
        expect(leaf.t).toBeGreaterThanOrEqual(0.05);
        expect(leaf.t).toBeLessThanOrEqual(0.95);
        expect(leaf.side === -1 || leaf.side === 1).toBe(true);
        expect(leaf.variant).toBeGreaterThanOrEqual(0);
        expect(leaf.variant).toBeLessThanOrEqual(3);
        expect(leaf.size).toBeGreaterThan(0);
      }
    }
  });

  it('is deterministic per (roundPos, slotCenters)', () => {
    const input = { roundPos: 3, ...SCREEN, slotCenters: slotCenters(5) };
    expect(planTranslationChoiceStems(input)).toEqual(planTranslationChoiceStems(input));
  });

  it('changes anchors on respawn (different roundPos)', () => {
    const a = planTranslationChoiceStems({ roundPos: 0, ...SCREEN, slotCenters: slotCenters(4) });
    const b = planTranslationChoiceStems({ roundPos: 1, ...SCREEN, slotCenters: slotCenters(4) });

    expect(a.map(bush => [bush.baseX, bush.baseY])).not.toEqual(
      b.map(bush => [bush.baseX, bush.baseY]),
    );
  });

  it('changes the stem count when the option count changes', () => {
    const a = planTranslationChoiceStems({ roundPos: 0, ...SCREEN, slotCenters: slotCenters(3) });
    const b = planTranslationChoiceStems({ roundPos: 0, ...SCREEN, slotCenters: slotCenters(7) });

    expect(a).toHaveLength(3);
    expect(b).toHaveLength(7);
  });
});
