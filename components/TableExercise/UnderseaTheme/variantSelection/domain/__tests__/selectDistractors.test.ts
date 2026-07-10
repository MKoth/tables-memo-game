import { selectDistractors } from '../selectDistractors';

describe('selectDistractors', () => {
  const body: string[][] = [
    ['hablo', 'como', 'vivo'],
    ['hablas', 'comes', 'vives'],
    ['habla', 'come', 'vive'],
    ['hablamos', 'comemos', 'vivimos'],
    ['habláis', 'coméis', 'vivís'],
    ['hablan', 'comen', 'viven'],
  ];

  it('returns exactly 2 distractors', () => {
    const distractors = selectDistractors(body, 0, 0);
    expect(distractors).toHaveLength(2);
  });

  it('returns forms from the same infinitive column (different rows)', () => {
    const distractors = selectDistractors(body, 3, 0);
    const column = body.map(row => row[0]);
    distractors.forEach(form => {
      expect(column).toContain(form);
    });
  });

  it('excludes the target row', () => {
    const distractors = selectDistractors(body, 0, 0);
    expect(distractors).not.toContain('hablo');
  });

  it('returns forms from different pronoun rows than the target', () => {
    const distractors = selectDistractors(body, 0, 1);
    const column = body.map(row => row[1]);
    distractors.forEach(form => {
      expect(column).toContain(form);
    });
    expect(distractors).not.toContain('como');
  });

  it('works for a different column', () => {
    const distractors = selectDistractors(body, 2, 2);
    const column = body.map(row => row[2]);
    distractors.forEach(form => {
      expect(column).toContain(form);
    });
    expect(distractors).not.toContain('vive');
  });
});
