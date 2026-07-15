import type { SentencePromptDisplaySlot } from '../../../UnderseaTheme/sentenceTransformation/domain/types';
import {
  blankSlotCenter,
  computeLetterLayout,
  computeRoundResolutionFlight,
  computeSentenceRowLayout,
  previewCenterForLetter,
  TRANSFORMATION_WORD_ROW_Y_RATIO,
} from '../exerciseLayout';
import type { ZoneRect } from '../computeExerciseLayout';

const KOI_RECT: ZoneRect = { x: 100, y: 200, w: 400, h: 300 };
const JELLY_RECT: ZoneRect = { x: 50, y: 80, w: 500, h: 220 };

describe('computeLetterLayout', () => {
  it('returns empty centers and minimum diameter for zero letters', () => {
    const layout = computeLetterLayout(KOI_RECT, 0);

    expect(layout.centers).toEqual([]);
    expect(layout.diameter).toBe(34);
    expect(layout.rowY).toBe(KOI_RECT.y + KOI_RECT.h * TRANSFORMATION_WORD_ROW_Y_RATIO);
  });

  it('places three letter centers evenly in the koi zone row', () => {
    const layout = computeLetterLayout(KOI_RECT, 3);

    expect(layout.diameter).toBe(54);
    expect(layout.rowY).toBe(260);
    expect(layout.centers).toHaveLength(3);
    expect(layout.centers[0]).toBeCloseTo(231.96, 1);
    expect(layout.centers[1]).toBeCloseTo(300, 1);
    expect(layout.centers[2]).toBeCloseTo(368.04, 1);
  });

  it('clamps diameter to the minimum for long words in a narrow zone', () => {
    const narrow: ZoneRect = { x: 0, y: 0, w: 200, h: 400 };
    const layout = computeLetterLayout(narrow, 12);

    expect(layout.diameter).toBe(34);
    expect(layout.centers).toHaveLength(12);
  });
});

describe('previewCenterForLetter', () => {
  it('maps positions before and after the insert index to target layout centers', () => {
    const targetLayout = computeLetterLayout(KOI_RECT, 5);
    const preview = { insertIndex: 2, insertLength: 1, targetLetterCount: 5 };

    expect(previewCenterForLetter(0, preview, targetLayout)).toBe(targetLayout.centers[0]);
    expect(previewCenterForLetter(1, preview, targetLayout)).toBe(targetLayout.centers[1]);
    expect(previewCenterForLetter(2, preview, targetLayout)).toBe(targetLayout.centers[3]);
    expect(previewCenterForLetter(3, preview, targetLayout)).toBe(targetLayout.centers[4]);
  });
});

describe('computeSentenceRowLayout', () => {
  it('returns empty arrays for no slots', () => {
    const layout = computeSentenceRowLayout({
      slots: [],
      jellyRect: JELLY_RECT,
      koiRect: KOI_RECT,
      conjugatedForm: '',
      roundPos: 0,
    });

    expect(layout).toEqual({
      xs: [],
      ys: [],
      scales: [],
      configs: [],
      fontScale: 1,
      blankFootprintDiameter: 0,
    });
  });

  it('centers a single-line sentence horizontally and vertically in the jelly zone', () => {
    const slots: SentencePromptDisplaySlot[] = [
      { kind: 'token', text: 'Yo' },
      { kind: 'blank' },
      { kind: 'token', text: 'hoy.' },
    ];
    const layout = computeSentenceRowLayout({
      slots,
      jellyRect: JELLY_RECT,
      koiRect: KOI_RECT,
      conjugatedForm: 'como',
      roundPos: 0,
    });

    expect(layout.xs).toHaveLength(3);
    expect(layout.ys).toHaveLength(3);
    expect(layout.ys[0]).toBe(layout.ys[1]);
    expect(layout.ys[1]).toBe(layout.ys[2]);
    expect(layout.xs[0]).toBeLessThan(layout.xs[1]);
    expect(layout.xs[1]).toBeLessThan(layout.xs[2]);
    expect(layout.configs[1]?.kind).toBe('blank');
    expect(layout.configs[1]?.label).toBe('?');
  });

  it('rolls varied token sizes that are stable for the round', () => {
    const slots: SentencePromptDisplaySlot[] = [
      { kind: 'token', text: 'word1' },
      { kind: 'token', text: 'word2' },
    ];
    const layout1 = computeSentenceRowLayout({
      slots,
      jellyRect: JELLY_RECT,
      koiRect: KOI_RECT,
      conjugatedForm: 'target',
      roundPos: 0,
    });
    const layout2 = computeSentenceRowLayout({
      slots,
      jellyRect: JELLY_RECT,
      koiRect: KOI_RECT,
      conjugatedForm: 'target',
      roundPos: 0,
    });

    expect(layout1.scales[0]).not.toBe(layout1.scales[1]);
    expect(layout1.scales[0]).toBe(layout2.scales[0]);
  });

  it('caps the blank footprint diameter for very long words', () => {
    const slots: SentencePromptDisplaySlot[] = [{ kind: 'blank' }];
    const layout = computeSentenceRowLayout({
      slots,
      jellyRect: JELLY_RECT,
      koiRect: KOI_RECT,
      conjugatedForm: 'extraordinariamente',
      roundPos: 0,
    });

    expect(layout.blankFootprintDiameter).toBeLessThanOrEqual(180);
    expect(layout.configs[0]?.bellSize).toBeCloseTo(layout.blankFootprintDiameter * 0.7, 1);
  });

  it('wraps a long sentence onto multiple lines', () => {
    const slots: SentencePromptDisplaySlot[] = Array.from({ length: 14 }, (_, index) => ({
      kind: 'token' as const,
      text: `w${index}`,
    }));
    const layout = computeSentenceRowLayout({
      slots,
      jellyRect: JELLY_RECT,
      koiRect: KOI_RECT,
      conjugatedForm: 'target',
      roundPos: 0,
    });
    const uniqueYs = new Set(layout.ys);

    expect(uniqueYs.size).toBeGreaterThan(1);
  });
});

describe('computeRoundResolutionFlight', () => {
  const SLOTS_WITH_BLANK: SentencePromptDisplaySlot[] = [
    { kind: 'token', text: 'Yo' },
    { kind: 'blank' },
    { kind: 'token', text: 'hoy.' },
  ];

  it('returns null when there is no blank slot', () => {
    const slots: SentencePromptDisplaySlot[] = [{ kind: 'token', text: 'hola' }];

    expect(
      computeRoundResolutionFlight({
        slots,
        jellyRect: JELLY_RECT,
        koiRect: KOI_RECT,
        conjugatedForm: 'como',
        roundPos: 0,
      }),
    ).toBeNull();
  });

  it('returns fly-from center averaged across letter row and fly-to blank slot geometry', () => {
    const conjugatedForm = 'como';
    const letterLayout = computeLetterLayout(KOI_RECT, conjugatedForm.length);
    const blank = blankSlotCenter(SLOTS_WITH_BLANK, JELLY_RECT, KOI_RECT, conjugatedForm, 0);

    expect(
      computeRoundResolutionFlight({
        slots: SLOTS_WITH_BLANK,
        jellyRect: JELLY_RECT,
        koiRect: KOI_RECT,
        conjugatedForm,
        roundPos: 0,
      }),
    ).toEqual({
      fromCenterX: (letterLayout.centers[0]! + letterLayout.centers[3]!) * 0.5,
      fromCenterY: letterLayout.rowY,
      fromDiameter: blank!.footprintDiameter,
      toCenterX: blank!.x,
      toCenterY: blank!.y,
      toDiameter: blank!.footprintDiameter,
    });
  });
});

describe('blankSlotCenter', () => {
  it('returns null when there is no blank slot', () => {
    const slots: SentencePromptDisplaySlot[] = [{ kind: 'token', text: 'hola' }];

    expect(blankSlotCenter(slots, JELLY_RECT, KOI_RECT, 'target', 0)).toBeNull();
  });

  it('returns the same coordinates as sentence row layout for the blank index', () => {
    const slots: SentencePromptDisplaySlot[] = [
      { kind: 'token', text: 'Yo' },
      { kind: 'blank' },
      { kind: 'token', text: 'hoy.' },
    ];
    const layout = computeSentenceRowLayout({
      slots,
      jellyRect: JELLY_RECT,
      koiRect: KOI_RECT,
      conjugatedForm: 'como',
      roundPos: 0,
    });
    const blankIndex = 1;
    const center = blankSlotCenter(slots, JELLY_RECT, KOI_RECT, 'como', 0);

    expect(center).toEqual({
      x: layout.xs[blankIndex],
      y: layout.ys[blankIndex],
      bellSize: layout.configs[blankIndex]?.bellSize,
      footprintDiameter: layout.blankFootprintDiameter,
    });
  });
});
