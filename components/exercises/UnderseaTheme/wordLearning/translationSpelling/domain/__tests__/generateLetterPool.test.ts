import { generateLetterPool } from '../generateLetterPool';

describe('generateLetterPool', () => {
  it('contains all letters from the target word', () => {
    const pool = generateLetterPool('casa');
    const targetLetters = 'casa'.split('');
    targetLetters.forEach(letter => {
      expect(pool).toContain(letter);
    });
  });

  it('contains all letters including duplicates from the target word', () => {
    const pool = generateLetterPool('casa');
    const aCount = pool.filter(l => l === 'a').length;
    expect(aCount).toBe(2);
  });

  it('includes 2-3 distractor letters not in the target word', () => {
    const pool = generateLetterPool('pan');
    const targetLetters = new Set('pan'.split(''));
    const distractors = pool.filter(l => !targetLetters.has(l));
    expect(distractors.length).toBeGreaterThanOrEqual(2);
    expect(distractors.length).toBeLessThanOrEqual(3);
  });

  it('distractor letters are not in the target word', () => {
    const pool = generateLetterPool('gato');
    const targetLetters = new Set('gato'.split(''));
    const distractors = pool.filter(l => !targetLetters.has(l));
    distractors.forEach(d => {
      expect(targetLetters.has(d)).toBe(false);
    });
  });

  it('distractor letters are from the Spanish alphabet', () => {
    const spanishAlphabet = new Set('abcdefghijklmnñopqrstuvwxyzáéíóúü'.split(''));
    const pool = generateLetterPool('perro');
    pool.forEach(letter => {
      expect(spanishAlphabet.has(letter)).toBe(true);
    });
  });

  it('treats accented characters as distinct from unaccented', () => {
    const pool = generateLetterPool('canción');
    expect(pool).toContain('ó');
    const targetLetters = new Set('canción'.split(''));
    const distractors = pool.filter(l => !targetLetters.has(l));
    distractors.forEach(d => {
      expect(d).not.toBe('ó');
    });
  });

  it('pool size equals target word length plus distractor count', () => {
    const pool = generateLetterPool('mesa');
    expect(pool.length).toBeGreaterThanOrEqual(6);
    expect(pool.length).toBeLessThanOrEqual(7);
  });

  it('works with words containing accented characters', () => {
    const pool = generateLetterPool('español');
    expect(pool).toContain('ñ');
  });

  it('returns a shuffled array with correct total length', () => {
    const pool = generateLetterPool('abc');
    expect(pool.length).toBeGreaterThanOrEqual(5);
    expect(pool.length).toBeLessThanOrEqual(6);
  });
});
