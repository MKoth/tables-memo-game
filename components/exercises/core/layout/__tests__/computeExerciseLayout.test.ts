import { computeExerciseLayout } from '../computeExerciseLayout';

describe('computeExerciseLayout', () => {
  it('keeps the default 50/50 split when no zone ratios are provided', () => {
    const portrait = computeExerciseLayout(390, 844, 'portrait');
    expect(portrait.roamerRect).toEqual({ x: 0, y: 422, w: 390, h: 422 });
    expect(portrait.spriteRect).toEqual({ x: 0, y: 42.2, w: 390, h: 379.8 });

    const landscape = computeExerciseLayout(844, 390, 'landscapeLeft');
    expect(landscape.roamerRect).toEqual({ x: 0, y: 0, w: 422, h: 390 });
    expect(landscape.spriteRect).toEqual({ x: 422, y: 19.5, w: 422, h: 370.5 });
  });

  it('makes both zones the full screen when roamerFraction is 1', () => {
    const ratios = { roamerFraction: 1, wordSpriteInsetRatio: 0, wordSpriteHeightFraction: 1 };
    const portrait = computeExerciseLayout(390, 844, 'portrait', ratios);
    expect(portrait.roamerRect).toEqual({ x: 0, y: 0, w: 390, h: 844 });
    expect(portrait.spriteRect).toEqual({ x: 0, y: 0, w: 390, h: 844 });

    const landscape = computeExerciseLayout(844, 390, 'landscapeRight', ratios);
    expect(landscape.roamerRect).toEqual({ x: 0, y: 0, w: 844, h: 390 });
    expect(landscape.spriteRect).toEqual({ x: 0, y: 0, w: 844, h: 390 });
  });

  it('respects custom zone ratios for partial splits', () => {
    const ratios = { roamerFraction: 0.7, wordSpriteInsetRatio: 0.1, wordSpriteHeightFraction: 0.25 };
    const portrait = computeExerciseLayout(400, 800, 'portrait', ratios);
    expect(portrait.roamerRect).toEqual({ x: 0, y: 560, w: 400, h: 240 });
    expect(portrait.spriteRect).toEqual({ x: 0, y: 80, w: 400, h: 200 });
  });
});
