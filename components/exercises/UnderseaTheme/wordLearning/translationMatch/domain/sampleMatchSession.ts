import type { WordEntry, WordList } from '../../../../../../data/wordsData';

export type SampleMatchSessionOptions = {
  shuffleIndices?: (count: number) => number[];
};

function defaultShuffleIndices(count: number): number[] {
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }
  return indices;
}

function hasCollision(sample: WordEntry[]): boolean {
  const spanish = new Set<string>();
  const english = new Set<string>();
  for (const entry of sample) {
    if (spanish.has(entry.spanish) || english.has(entry.english)) {
      return true;
    }
    spanish.add(entry.spanish);
    english.add(entry.english);
  }
  return false;
}

export function sampleMatchSession(
  wordLists: WordList[],
  sampleSize: number = 8,
  options: SampleMatchSessionOptions = {},
): WordEntry[] {
  const pool = wordLists.flatMap(wl => wl.words);

  if (pool.length < sampleSize) {
    throw new Error(
      `sampleMatchSession: pool has ${pool.length} entries but needs at least ${sampleSize}`,
    );
  }

  const shuffleItems = options.shuffleIndices ?? defaultShuffleIndices;

  for (;;) {
    const indices = shuffleItems(pool.length);
    const sample = indices.slice(0, sampleSize).map(i => pool[i]!);
    if (!hasCollision(sample)) {
      return sample;
    }
  }
}
