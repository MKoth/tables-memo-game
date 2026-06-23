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

export const sampleSpanishTable = createTableData(
  'spanish-present-hablar',
  'Spanish Present Tense - hablar',
  ['Yo', 'Tú', 'Él/Ella', 'Nosotros', 'Vosotros', 'Ellos/Ellas'],
  ['hablar', 'comer', 'vivir', 'cantar', 'bailar', 'correr', 'saltar'],
  [
    ['hablo', 'como', 'vivo', 'canto', 'bailo', 'corro', 'salto'],
    ['hablas', 'comes', 'vives', 'cantas', 'bailas', 'corres', 'saltas'],
    ['habla', 'come', 'vive', 'canta', 'baila', 'corre', 'salta'],
    ['hablamos', 'comemos', 'vivimos', 'cantamos', 'bailamos', 'corremos', 'saltamos'],
    ['habláis', 'coméis', 'vivís', 'cantáis', 'bailáis', 'corréis', 'saltáis'],
    ['hablan', 'comen', 'viven', 'cantan', 'bailan', 'corren', 'saltan'],
  ],
);
