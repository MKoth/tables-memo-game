import {
  spanishPresentTable2Plural,
  type SentencePrompt,
  type TableData,
} from '../../../../../../data/tableData';
import { createWordTransformationExercise } from '../../../wordTransformation/domain';
import {
  buildSentenceTransformationRounds,
  createSentenceTransformationExercise,
  expandSentencePromptSlots,
  validateSentencePromptsForTable,
} from '../index';

const VALID_PROMPT: SentencePrompt = {
  tokens: ['Nosotros', 'en', 'el', 'coro'],
  blankIndex: 1,
  tokenTranslations: ['We', 'in', 'the', 'choir'],
};

function tableWithPromptAt(
  rowIndex: number,
  colIndex: number,
  prompt: SentencePrompt,
): TableData {
  const bodySentencePrompts = spanishPresentTable2Plural.bodySentencePrompts!.map(
    row => [...row],
  );
  bodySentencePrompts[rowIndex]![colIndex] = prompt;
  return { ...spanishPresentTable2Plural, bodySentencePrompts };
}

function tableWithMissingPrompt(rowIndex: number, colIndex: number): TableData {
  const bodySentencePrompts = spanishPresentTable2Plural.bodySentencePrompts!.map(
    row => [...row],
  );
  bodySentencePrompts[rowIndex]![colIndex] = undefined as unknown as SentencePrompt;
  return { ...spanishPresentTable2Plural, bodySentencePrompts };
}

describe('validateSentencePromptsForTable', () => {
  it('accepts a prompt for every body cell with valid blankIndex', () => {
    expect(() =>
      validateSentencePromptsForTable(spanishPresentTable2Plural),
    ).not.toThrow();
  });

  it('rejects blankIndex below zero', () => {
    const table = tableWithPromptAt(0, 0, { tokens: ['Nosotros'], blankIndex: -1, tokenTranslations: [''] });

    expect(() => validateSentencePromptsForTable(table)).toThrow(/blankIndex/i);
  });

  it('rejects blankIndex above tokens.length', () => {
    const table = tableWithPromptAt(0, 0, {
      tokens: ['Nosotros', 'bien'],
      blankIndex: 3,
      tokenTranslations: ['', ''],
    });

    expect(() => validateSentencePromptsForTable(table)).toThrow(/blankIndex/i);
  });

  it('throws when any body cell is missing a sentence prompt', () => {
    const table = tableWithMissingPrompt(0, 2);

    expect(() => validateSentencePromptsForTable(table)).toThrow(/missing/i);
  });

  it('throws when bodySentencePrompts is absent', () => {
    const table: TableData = {
      ...spanishPresentTable2Plural,
      bodySentencePrompts: undefined,
    };

    expect(() => validateSentencePromptsForTable(table)).toThrow(/missing bodySentencePrompts/i);
  });

  it('throws when bodySentencePrompts dimensions do not match body', () => {
    const table: TableData = {
      ...spanishPresentTable2Plural,
      bodySentencePrompts: spanishPresentTable2Plural.bodySentencePrompts!.slice(0, 1),
    };

    expect(() => validateSentencePromptsForTable(table)).toThrow(/dimensions/i);
  });
});

describe('expandSentencePromptSlots', () => {
  it('inserts a blank slot at blankIndex between sparse tokens', () => {
    expect(expandSentencePromptSlots(VALID_PROMPT)).toEqual([
      { kind: 'token', text: 'Nosotros', translation: 'We' },
      { kind: 'blank' },
      { kind: 'token', text: 'en', translation: 'in' },
      { kind: 'token', text: 'el', translation: 'the' },
      { kind: 'token', text: 'coro', translation: 'choir' },
    ]);
  });

  it('places the blank before all tokens when blankIndex is zero', () => {
    expect(
      expandSentencePromptSlots({ tokens: ['bien', 'hoy'], blankIndex: 0, tokenTranslations: ['', ''] }),
    ).toEqual([
      { kind: 'blank' },
      { kind: 'token', text: 'bien', translation: '' },
      { kind: 'token', text: 'hoy', translation: '' },
    ]);
  });

  it('places the blank after all tokens when blankIndex equals tokens.length', () => {
    expect(
      expandSentencePromptSlots({ tokens: ['Ellos'], blankIndex: 1, tokenTranslations: [''] }),
    ).toEqual([{ kind: 'token', text: 'Ellos', translation: '' }, { kind: 'blank' }]);
  });

  it('rejects invalid blankIndex', () => {
    expect(() =>
      expandSentencePromptSlots({ tokens: ['Nosotros'], blankIndex: 2, tokenTranslations: [''] }),
    ).toThrow(/blankIndex/i);
  });
});

describe('createSentenceTransformationExercise', () => {
  it('builds twelve rounds for spanishPresentTable2Plural', () => {
    const exercise = createSentenceTransformationExercise(
      spanishPresentTable2Plural,
      { shuffleIndices: (count) => Array.from({ length: count }, (_, i) => i) },
    );

    expect(exercise.rounds).toHaveLength(12);
    expect(exercise.roundOrder).toHaveLength(12);
  });

  it('links each round to the correct infinitive, conjugated form, and prompt', () => {
    const exercise = createSentenceTransformationExercise(
      spanishPresentTable2Plural,
      { shuffleIndices: (count) => Array.from({ length: count }, (_, i) => i) },
    );

    const round = exercise.rounds[0]!;
    expect(round.rowIndex).toBe(0);
    expect(round.colIndex).toBe(0);
    expect(round.infinitive).toBe('cantar');
    expect(round.conjugatedForm).toBe('cantamos');
    expect(round.sentencePrompt).toEqual(
      spanishPresentTable2Plural.bodySentencePrompts![0]![0],
    );
    expect(round.displaySlots[1]).toEqual({ kind: 'blank' });
  });

  it('shuffles round order while covering every round exactly once', () => {
    const exercise = createSentenceTransformationExercise(
      spanishPresentTable2Plural,
      { shuffleIndices: () => [11, 5, 0, 7, 3, 9, 1, 6, 2, 10, 4, 8] },
    );

    expect(exercise.roundOrder).toEqual([11, 5, 0, 7, 3, 9, 1, 6, 2, 10, 4, 8]);
    expect(new Set(exercise.roundOrder).size).toBe(12);
  });

  it('uses the table transformation factory operation sequences for each round', () => {
    const tableExercise = createWordTransformationExercise(spanishPresentTable2Plural);
    const rounds = buildSentenceTransformationRounds(
      spanishPresentTable2Plural,
      tableExercise,
    );

    rounds.forEach((round, index) => {
      const tableSequence = tableExercise.sequences[index]!;
      expect(round.operations).toBe(tableSequence.operations);
      expect(round.infinitive).toBe(tableSequence.baseWord);
      expect(round.conjugatedForm).toBe(tableSequence.targetWord);
      expect(round.rowIndex).toBe(tableSequence.rowIndex);
      expect(round.colIndex).toBe(tableSequence.colIndex);
    });
  });

  it('throws when sentence prompts are incomplete', () => {
    const table = tableWithMissingPrompt(1, 1);

    expect(() => createSentenceTransformationExercise(table)).toThrow(/missing/i);
  });
});
