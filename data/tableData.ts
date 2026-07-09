export type TableTranslationRule = 'spanish-present';

/** Sparse sentence prompt tied to one body cell; blank slot is a position, not a token. */
export type SentencePrompt = {
  /** Display words; the blank slot is omitted from this list. */
  tokens: string[];
  /** 0..tokens.length inclusive — blank sits after the first blankIndex tokens. */
  blankIndex: number;
  /** English translation for each token (same length as tokens). */
  tokenTranslations: string[];
};

export type TableData = {
  id: string;
  title: string;
  /** One label per body row (e.g. pronouns). Scrolls vertically with the body. */
  rowHeaders: string[];
  /** One label per body column (e.g. infinitives). Scrolls horizontally with the body. */
  colHeaders: string[];
  /** body[rowIndex][colIndex] = conjugated form. */
  body: string[][];
  /** bodySentencePrompts[rowIndex][colIndex] parallels body[row][col]. */
  bodySentencePrompts?: SentencePrompt[][];
  /** English gloss for each row header (same order as rowHeaders). */
  rowHeaderTranslations: string[];
  /** English gloss for each column header (same order as colHeaders). */
  colHeaderTranslations: string[];
  /** bodyTranslations[rowIndex][colIndex] = contextual English gloss. */
  bodyTranslations: string[][];
};

/** All body cell strings in row-major order — one entry per table body cell. */
export function getTableBodyWords(table: TableData): string[] {
  return table.body.flat();
}

const SPANISH_PRONOUN_EN: Record<string, string> = {
  Yo: 'I',
  Tú: 'you',
  'Él/Ella': 'he/she',
  Nosotros: 'we',
  Vosotros: 'you all',
  'Ellos/Ellas': 'they',
};

const SPANISH_VERB_EN: Record<string, string> = {
  hablar: 'speak',
  comer: 'eat',
  vivir: 'live',
  cantar: 'sing',
  bailar: 'dance',
  correr: 'run',
  saltar: 'jump',
};

function englishThirdPersonSingular(verb: string): string {
  if (verb.endsWith('s') || verb.endsWith('x') || verb.endsWith('ch') || verb.endsWith('sh')) {
    return `${verb}es`;
  }
  if (verb.endsWith('y') && !/[aeiou]y$/i.test(verb)) {
    return `${verb.slice(0, -1)}ies`;
  }
  return `${verb}s`;
}

function buildSpanishPresentBodyTranslation(subjectEn: string, verbBase: string): string {
  const verb =
    subjectEn === 'he/she' ? englishThirdPersonSingular(verbBase) : verbBase;
  return `${subjectEn} ${verb}`;
}

function buildSpanishPresentTranslations(
  rowHeaders: string[],
  colHeaders: string[],
  body: string[][],
): Pick<TableData, 'rowHeaderTranslations' | 'colHeaderTranslations' | 'bodyTranslations'> {
  const rowHeaderTranslations = rowHeaders.map(
    header => SPANISH_PRONOUN_EN[header] ?? header,
  );
  const colHeaderTranslations = colHeaders.map(infinitive => {
    const verb = SPANISH_VERB_EN[infinitive];
    return verb != null ? `to ${verb}` : infinitive;
  });
  const bodyTranslations = body.map((row, r) =>
    row.map((_cell, c) => {
      const subjectEn = rowHeaderTranslations[r] ?? rowHeaders[r];
      const infinitive = colHeaders[c];
      const verbBase = SPANISH_VERB_EN[infinitive];
      if (verbBase == null) {
        return body[r][c];
      }
      return buildSpanishPresentBodyTranslation(subjectEn, verbBase);
    }),
  );
  return { rowHeaderTranslations, colHeaderTranslations, bodyTranslations };
}

function buildEmptyTranslations(
  rowHeaders: string[],
  colHeaders: string[],
  body: string[][],
): Pick<TableData, 'rowHeaderTranslations' | 'colHeaderTranslations' | 'bodyTranslations'> {
  return {
    rowHeaderTranslations: rowHeaders.map(() => ''),
    colHeaderTranslations: colHeaders.map(() => ''),
    bodyTranslations: body.map(row => row.map(() => '')),
  };
}

export function createTableData(
  id: string,
  title: string,
  rowHeaders: string[],
  colHeaders: string[],
  body: string[][],
  translationRule?: TableTranslationRule,
  bodySentencePrompts?: SentencePrompt[][],
): TableData {
  if (body.length !== rowHeaders.length) {
    throw new Error(
      `createTableData: body has ${body.length} rows but rowHeaders has ${rowHeaders.length} entries`,
    );
  }
  for (let r = 0; r < body.length; r++) {
    if (body[r].length !== colHeaders.length) {
      throw new Error(
        `createTableData: body[${r}] has ${body[r].length} columns but colHeaders has ${colHeaders.length} entries`,
      );
    }
  }

  if (bodySentencePrompts != null) {
    if (bodySentencePrompts.length !== rowHeaders.length) {
      throw new Error(
        `createTableData: bodySentencePrompts has ${bodySentencePrompts.length} rows but rowHeaders has ${rowHeaders.length} entries`,
      );
    }
    for (let r = 0; r < bodySentencePrompts.length; r++) {
      if (bodySentencePrompts[r]!.length !== colHeaders.length) {
        throw new Error(
          `createTableData: bodySentencePrompts[${r}] has ${bodySentencePrompts[r]!.length} columns but colHeaders has ${colHeaders.length} entries`,
        );
      }
    }
  }

  const translations =
    translationRule === 'spanish-present'
      ? buildSpanishPresentTranslations(rowHeaders, colHeaders, body)
      : buildEmptyTranslations(rowHeaders, colHeaders, body);

  return {
    id,
    title,
    rowHeaders,
    colHeaders,
    body,
    ...(bodySentencePrompts != null ? { bodySentencePrompts } : {}),
    ...translations,
  };
}

const SPANISH_ROW_HEADERS = [
  'Yo',
  'Tú',
  'Él/Ella',
  'Nosotros',
  'Vosotros',
  'Ellos/Ellas',
] as const;

const SPANISH_SINGULAR_ROW_HEADERS = SPANISH_ROW_HEADERS.slice(0, 3);

const SPANISH_PLURAL_ROW_HEADERS = SPANISH_ROW_HEADERS.slice(3, 6);

const SPANISH_BODY_FULL = [
  ['hablo', 'como', 'vivo', 'canto', 'bailo', 'corro', 'salto'],
  ['hablas', 'comes', 'vives', 'cantas', 'bailas', 'corres', 'saltas'],
  ['habla', 'come', 'vive', 'canta', 'baila', 'corre', 'salta'],
  ['hablamos', 'comemos', 'vivimos', 'cantamos', 'bailamos', 'corremos', 'saltamos'],
  ['habláis', 'coméis', 'vivís', 'cantáis', 'bailáis', 'corréis', 'saltáis'],
  ['hablan', 'comen', 'viven', 'cantan', 'bailan', 'corren', 'saltan'],
] as const;

/** Present tense — hablar, comer, vivir (all pronouns). */
export const spanishPresentTable1 = createTableData(
  'spanish-present-part-1',
  'Spanish Present — hablar, comer, vivir',
  [...SPANISH_ROW_HEADERS],
  ['hablar', 'comer', 'vivir'],
  SPANISH_BODY_FULL.map(row => row.slice(0, 3)),
  'spanish-present',
);

/** Present tense — cantar, bailar, correr, saltar (all pronouns). */
export const spanishPresentTable2 = createTableData(
  'spanish-present-part-2',
  'Spanish Present — cantar, bailar, correr, saltar',
  [...SPANISH_ROW_HEADERS],
  ['cantar', 'bailar', 'correr', 'saltar'],
  SPANISH_BODY_FULL.map(row => row.slice(3, 7)),
  'spanish-present',
);

export const spanishPresentTable1Singular = createTableData(
  'spanish-present-part-1-singular',
  'Spanish Present — hablar, comer, vivir (singular)',
  [...SPANISH_SINGULAR_ROW_HEADERS],
  ['hablar', 'comer', 'vivir'],
  SPANISH_BODY_FULL.slice(0, 3).map(row => row.slice(0, 3)),
  'spanish-present',
);

export const spanishPresentTable2Singular = createTableData(
  'spanish-present-part-2-singular',
  'Spanish Present — cantar, bailar, correr, saltar (singular)',
  [...SPANISH_SINGULAR_ROW_HEADERS],
  ['cantar', 'bailar', 'correr', 'saltar'],
  SPANISH_BODY_FULL.slice(0, 3).map(row => row.slice(3, 7)),
  'spanish-present',
);

export const spanishPresentTable1Plural = createTableData(
  'spanish-present-part-1-plural',
  'Spanish Present — hablar, comer, vivir (plural)',
  [...SPANISH_PLURAL_ROW_HEADERS],
  ['hablar', 'comer', 'vivir'],
  SPANISH_BODY_FULL.slice(3, 6).map(row => row.slice(0, 3)),
  'spanish-present',
);

const SPANISH_PRESENT_TABLE2_PLURAL_SENTENCE_PROMPTS: SentencePrompt[][] = [
  [
    { tokens: ['Nosotros', 'en', 'el', 'coro', 'los', 'domingos'], blankIndex: 1, tokenTranslations: ['We', 'in', 'the', 'choir', 'on', 'Sundays'] },
    { tokens: ['Nosotros', 'salsa', 'los', 'viernes'], blankIndex: 1, tokenTranslations: ['We', 'salsa', 'on', 'Fridays'] },
    { tokens: ['Nosotros', 'por', 'el', 'parque', 'cada', 'mañana'], blankIndex: 1, tokenTranslations: ['We', 'through', 'the', 'park', 'every', 'morning'] },
    { tokens: ['Nosotros', 'la', 'cuerda', 'en', 'el', 'patio'], blankIndex: 1, tokenTranslations: ['We', 'the', 'rope', 'in', 'the', 'yard'] },
  ],
  [
    { tokens: ['Vosotros', 'muy', 'bien', 'en', 'el', 'escenario'], blankIndex: 1, tokenTranslations: ['You all', 'very', 'well', 'on', 'the', 'stage'] },
    { tokens: ['Vosotros', 'en', 'la', 'fiesta', 'de', 'cumpleaños'], blankIndex: 1, tokenTranslations: ['You all', 'at', 'the', 'party', 'of', 'birthday'] },
    { tokens: ['Vosotros', 'en', 'la', 'playa', 'por', 'la', 'tarde'], blankIndex: 1, tokenTranslations: ['You all', 'on', 'the', 'beach', 'in', 'the', 'afternoon'] },
    { tokens: ['Vosotros', 'muy', 'alto', 'en', 'el', 'gimnasio'], blankIndex: 1, tokenTranslations: ['You all', 'very', 'high', 'in', 'the', 'gym'] },
  ],
  [
    { tokens: ['Ellos', 'una', 'canción', 'bonita'], blankIndex: 1, tokenTranslations: ['They', 'a', 'song', 'beautiful'] },
    { tokens: ['Ellas', 'tango', 'en', 'la', 'plaza'], blankIndex: 1, tokenTranslations: ['They', 'tango', 'in', 'the', 'square'] },
    { tokens: ['Los', 'niños', 'rápido', 'hacia', 'la', 'meta'], blankIndex: 2, tokenTranslations: ['The', 'children', 'fast', 'toward', 'the', 'finish'] },
    { tokens: ['Ellos', 'sobre', 'las', 'olas', 'del', 'mar'], blankIndex: 1, tokenTranslations: ['They', 'over', 'the', 'waves', 'of the', 'sea'] },
  ],
];

export const spanishPresentTable2Plural = createTableData(
  'spanish-present-part-2-plural',
  'Spanish Present — cantar, bailar, correr, saltar (plural)',
  [...SPANISH_PLURAL_ROW_HEADERS],
  ['cantar', 'bailar', 'correr', 'saltar'],
  SPANISH_BODY_FULL.slice(3, 6).map(row => row.slice(3, 7)),
  'spanish-present',
  SPANISH_PRESENT_TABLE2_PLURAL_SENTENCE_PROMPTS,
);

/** Full present tense table (original). */
export const sampleSpanishTable = createTableData(
  'spanish-present-hablar',
  'Spanish Present Tense - hablar',
  [...SPANISH_ROW_HEADERS],
  ['hablar', 'comer', 'vivir', 'cantar', 'bailar', 'correr', 'saltar'],
  SPANISH_BODY_FULL.map(row => [...row]),
  'spanish-present',
);
