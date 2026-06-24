export type TableData = {
  id: string;
  title: string;
  /** One label per body row (e.g. pronouns). Scrolls vertically with the body. */
  rowHeaders: string[];
  /** One label per body column (e.g. infinitives). Scrolls horizontally with the body. */
  colHeaders: string[];
  /** body[rowIndex][colIndex] = conjugated form. */
  body: string[][];
};

export function createTableData(
  id: string,
  title: string,
  rowHeaders: string[],
  colHeaders: string[],
  body: string[][],
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
  return { id, title, rowHeaders, colHeaders, body };
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
);

/** Present tense — cantar, bailar, correr, saltar (all pronouns). */
export const spanishPresentTable2 = createTableData(
  'spanish-present-part-2',
  'Spanish Present — cantar, bailar, correr, saltar',
  [...SPANISH_ROW_HEADERS],
  ['cantar', 'bailar', 'correr', 'saltar'],
  SPANISH_BODY_FULL.map(row => row.slice(3, 7)),
);

const spanishPresentTable1Singular = createTableData(
  'spanish-present-part-1-singular',
  'Spanish Present — hablar, comer, vivir (singular)',
  [...SPANISH_SINGULAR_ROW_HEADERS],
  ['hablar', 'comer', 'vivir'],
  SPANISH_BODY_FULL.slice(0, 3).map(row => row.slice(0, 3)),
);

const spanishPresentTable2Singular = createTableData(
  'spanish-present-part-2-singular',
  'Spanish Present — cantar, bailar, correr, saltar (singular)',
  [...SPANISH_SINGULAR_ROW_HEADERS],
  ['cantar', 'bailar', 'correr', 'saltar'],
  SPANISH_BODY_FULL.slice(0, 3).map(row => row.slice(3, 7)),
);

/** Full present tense table (original). */
export const sampleSpanishTable = createTableData(
  'spanish-present-hablar',
  'Spanish Present Tense - hablar',
  [...SPANISH_ROW_HEADERS],
  ['hablar', 'comer', 'vivir', 'cantar', 'bailar', 'correr', 'saltar'],
  SPANISH_BODY_FULL.map(row => [...row]),
);
