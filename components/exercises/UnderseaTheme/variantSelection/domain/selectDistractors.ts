export function selectDistractors(
  body: string[][],
  targetRowIndex: number,
  targetColIndex: number,
): string[] {
  const col = body.map(row => row[targetColIndex]);
  const candidates: string[] = [];
  for (let rowIndex = 0; rowIndex < col.length; rowIndex++) {
    if (rowIndex !== targetRowIndex) {
      const form = col[rowIndex];
      if (form != null) {
        candidates.push(form);
      }
    }
  }
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, 2);
}
