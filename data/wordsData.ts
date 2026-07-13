export type WordEntry = {
  spanish: string;
  english: string;
};

export type WordList = {
  id: string;
  title: string;
  words: WordEntry[];
};

export function createWordList(
  id: string,
  title: string,
  words: WordEntry[],
): WordList {
  if (words.length < 3) {
    throw new Error(
      `createWordList: "${id}" has ${words.length} entries but requires at least 3`,
    );
  }
  return { id, title, words };
}

export const animalsWordList = createWordList(
  'animals',
  'Animals',
  [
    { spanish: 'gato', english: 'cat' },
    { spanish: 'perro', english: 'dog' },
    { spanish: 'pájaro', english: 'bird' },
    { spanish: 'caballo', english: 'horse' },
    { spanish: 'ratón', english: 'mouse' },
    { spanish: 'cigüeña', english: 'stork' },
  ],
);

export const foodWordList = createWordList(
  'food',
  'Food',
  [
    { spanish: 'manzana', english: 'apple' },
    { spanish: 'pan', english: 'bread' },
    { spanish: 'queso', english: 'cheese' },
    { spanish: 'arroz', english: 'rice' },
    { spanish: 'café', english: 'coffee' },
    { spanish: 'leche', english: 'milk' },
  ],
);

export const commonVerbsWordList = createWordList(
  'common-verbs',
  'Common Verbs',
  [
    { spanish: 'hablar', english: 'to speak' },
    { spanish: 'comer', english: 'to eat' },
    { spanish: 'vivir', english: 'to live' },
    { spanish: 'correr', english: 'to run' },
    { spanish: 'leer', english: 'to read' },
    { spanish: 'reír', english: 'to laugh' },
  ],
);

export const householdWordList = createWordList(
  'household',
  'Household Items',
  [
    { spanish: 'mesa', english: 'table' },
    { spanish: 'silla', english: 'chair' },
    { spanish: 'sofá', english: 'sofa' },
    { spanish: 'cama', english: 'bed' },
    { spanish: 'cajón', english: 'drawer' },
    { spanish: 'baúl', english: 'trunk' },
  ],
);

export const allWordLists: WordList[] = [
  animalsWordList,
  foodWordList,
  commonVerbsWordList,
  householdWordList,
];
