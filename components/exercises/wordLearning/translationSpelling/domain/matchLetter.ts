export function matchLetter(tappedLetter: string, expectedPosition: number, targetWord: string): boolean {
  if (expectedPosition < 0 || expectedPosition >= targetWord.length) {
    return false;
  }
  return tappedLetter === targetWord[expectedPosition];
}
