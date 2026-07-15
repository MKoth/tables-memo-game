import { spanishPresentTable2Plural } from '../../../../../data/tableData';
import {
  buildVariantSelectionRounds,
  createVariantSelectionExercise,
} from '../index';

describe('buildVariantSelectionRounds', () => {
  it('builds one round per body cell', () => {
    const rounds = buildVariantSelectionRounds(spanishPresentTable2Plural);
    const bodyCellCount =
      spanishPresentTable2Plural.body.length *
      spanishPresentTable2Plural.body[0]!.length;
    expect(rounds).toHaveLength(bodyCellCount);
  });

  it('each round has exactly 3 options', () => {
    const rounds = buildVariantSelectionRounds(spanishPresentTable2Plural);
    rounds.forEach(round => {
      expect(round.options).toHaveLength(3);
    });
  });

  it('each round includes the correct form among its options', () => {
    const rounds = buildVariantSelectionRounds(spanishPresentTable2Plural);
    rounds.forEach(round => {
      const correctOption = round.options.find(opt => opt.isCorrect);
      expect(correctOption).toBeDefined();
      expect(correctOption!.form).toBe(round.conjugatedForm);
    });
  });

  it('each round has exactly one correct option', () => {
    const rounds = buildVariantSelectionRounds(spanishPresentTable2Plural);
    rounds.forEach(round => {
      const correctOptions = round.options.filter(opt => opt.isCorrect);
      expect(correctOptions).toHaveLength(1);
    });
  });

  it('distractors are from the same infinitive column', () => {
    const rounds = buildVariantSelectionRounds(spanishPresentTable2Plural);
    const body = spanishPresentTable2Plural.body;
    rounds.forEach(round => {
      const column = body.map(row => row[round.colIndex]);
      round.options.forEach(opt => {
        expect(column).toContain(opt.form);
      });
    });
  });

  it('sets displaySlots with a blank', () => {
    const rounds = buildVariantSelectionRounds(spanishPresentTable2Plural);
    rounds.forEach(round => {
      const blankCount = round.displaySlots.filter(
        slot => slot.kind === 'blank',
      ).length;
      expect(blankCount).toBe(1);
    });
  });
});

describe('createVariantSelectionExercise', () => {
  it('builds an exercise with shuffled round order', () => {
    const exercise = createVariantSelectionExercise(spanishPresentTable2Plural, {
      shuffleIndices: count => Array.from({ length: count }, (_, i) => i),
    });
    const bodyCellCount =
      spanishPresentTable2Plural.body.length *
      spanishPresentTable2Plural.body[0]!.length;
    expect(exercise.rounds).toHaveLength(bodyCellCount);
    expect(exercise.roundOrder).toHaveLength(bodyCellCount);
  });

  it('shuffles round order while covering every round exactly once', () => {
    const exercise = createVariantSelectionExercise(spanishPresentTable2Plural, {
      shuffleIndices: () => [11, 5, 0, 7, 3, 9, 1, 6, 2, 10, 4, 8],
    });
    expect(exercise.roundOrder).toEqual([
      11, 5, 0, 7, 3, 9, 1, 6, 2, 10, 4, 8,
    ]);
    expect(new Set(exercise.roundOrder).size).toBe(12);
  });

  it('links each round to the correct infinitive and conjugated form', () => {
    const exercise = createVariantSelectionExercise(spanishPresentTable2Plural, {
      shuffleIndices: count => Array.from({ length: count }, (_, i) => i),
    });
    const round = exercise.rounds[0]!;
    expect(round.rowIndex).toBe(0);
    expect(round.colIndex).toBe(0);
    expect(round.infinitive).toBe('cantar');
    expect(round.conjugatedForm).toBe('cantamos');
  });

  it('exercise stores the table reference', () => {
    const exercise = createVariantSelectionExercise(spanishPresentTable2Plural);
    expect(exercise.table).toBe(spanishPresentTable2Plural);
  });
});
