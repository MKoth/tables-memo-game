import { matchLetter } from '../matchLetter';

describe('matchLetter', () => {
  it('returns true when tapped letter matches expected position', () => {
    expect(matchLetter('c', 0, 'casa')).toBe(true);
  });

  it('returns false when tapped letter does not match expected position', () => {
    expect(matchLetter('a', 0, 'casa')).toBe(false);
  });

  it('accepts any instance of a repeated letter', () => {
    expect(matchLetter('a', 1, 'casa')).toBe(true);
    expect(matchLetter('a', 3, 'casa')).toBe(true);
  });

  it('returns false for wrong letter even if it exists elsewhere in the word', () => {
    expect(matchLetter('s', 0, 'casa')).toBe(false);
  });

  it('treats accented characters as distinct from unaccented', () => {
    expect(matchLetter('a', 0, 'canción')).toBe(false);
    expect(matchLetter('ó', 5, 'canción')).toBe(true);
    expect(matchLetter('o', 5, 'canción')).toBe(false);
  });

  it('handles ñ as distinct from n', () => {
    expect(matchLetter('ñ', 4, 'español')).toBe(true);
    expect(matchLetter('n', 4, 'español')).toBe(false);
  });

  it('handles ü as distinct from u', () => {
    expect(matchLetter('ü', 4, 'vergüenza')).toBe(true);
    expect(matchLetter('u', 4, 'vergüenza')).toBe(false);
  });

  it('returns false for position out of bounds', () => {
    expect(matchLetter('c', 10, 'casa')).toBe(false);
  });

  it('returns false for negative position', () => {
    expect(matchLetter('c', -1, 'casa')).toBe(false);
  });

  it('works with single-letter words', () => {
    expect(matchLetter('a', 0, 'a')).toBe(true);
    expect(matchLetter('b', 0, 'a')).toBe(false);
  });

  it('works with words with all same letters', () => {
    expect(matchLetter('a', 0, 'aaa')).toBe(true);
    expect(matchLetter('a', 1, 'aaa')).toBe(true);
    expect(matchLetter('a', 2, 'aaa')).toBe(true);
  });
});
