import {
  REFERENCE_BODY_BELL_SIZE,
  computeWordSpriteFontScale,
  rollBodyTint,
} from '../wordSpriteVisualTokens';

describe('wordSpriteVisualTokens', () => {
  it('uses a shared reference bell size for font scaling', () => {
    expect(REFERENCE_BODY_BELL_SIZE).toBe(55);
    expect(computeWordSpriteFontScale(55)).toBe(1);
    expect(computeWordSpriteFontScale(27.5)).toBeCloseTo(0.5);
  });

  it('rolls deterministic body tints from grid coordinates', () => {
    const tint = rollBodyTint(2, 3);

    expect(tint).toEqual({
      tintMode: 1,
      tintStrength: 0.880337877660137,
      tintA: [0.6, 0.7, 1.15],
      tintB: [0.6, 0.7, 1.15],
      tintC: [0.85, 0.55, 0.95],
      animatedTint: true,
      tintWaveSpeed: 0.22907493366605486,
    });
  });

  it('treats a single index as column zero for sentence rows', () => {
    expect(rollBodyTint(4)).toEqual(rollBodyTint(4, 0));
  });
});
