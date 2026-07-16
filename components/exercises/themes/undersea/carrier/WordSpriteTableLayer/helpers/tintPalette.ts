import type { RGB } from '../../wordSpriteVisualTokens';
import { rollBodyTint, sr } from '../../wordSpriteVisualTokens';

export type { RGB, TintMode, TintSpawn } from '../../wordSpriteVisualTokens';
export { rollBodyTint, sr };

export const HEADER_ROW_A: RGB = [0.6, 0.85, 1.1];
export const HEADER_ROW_B: RGB = [0.45, 0.65, 1.0];
export const HEADER_COL_A: RGB = [0.85, 1.05, 0.6];
export const HEADER_COL_B: RGB = [0.65, 0.95, 0.5];

export function uniqueTintColors(tintA: RGB, tintB: RGB, tintC: RGB): RGB[] {
  const seen = new Set<string>();
  const out: RGB[] = [];
  for (const c of [tintA, tintB, tintC]) {
    const key = `${c[0]},${c[1]},${c[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

export function lightenTint(c: RGB, amount: number): RGB {
  return [
    c[0] + (1 - c[0]) * amount,
    c[1] + (1 - c[1]) * amount,
    c[2] + (1 - c[2]) * amount,
  ];
}

export function darkenTint(c: RGB, amount: number): RGB {
  return [c[0] * (1 - amount), c[1] * (1 - amount), c[2] * (1 - amount)];
}

export function tintToRgba(c: RGB, alpha: number): string {
  const ch = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  return `rgba(${ch(c[0])}, ${ch(c[1])}, ${ch(c[2])}, ${alpha})`;
}

/** Pick label fill/stroke from wordSprite tints; body is lightened, border darkened. */
export function rollLabelColors(
  tintA: RGB,
  tintB: RGB,
  tintC: RGB,
  seedA: number,
  seedB: number,
): { labelFillColor: string; labelStrokeColor: string } {
  const palette = uniqueTintColors(tintA, tintB, tintC);
  let bodyBase: RGB;
  let borderBase: RGB;

  if (palette.length >= 2) {
    const bodyIdx = Math.floor(sr(seedA, seedB) * palette.length);
    let borderIdx = Math.floor(sr(seedA + 41, seedB + 67) * palette.length);
    if (borderIdx === bodyIdx) {
      borderIdx = (borderIdx + 1) % palette.length;
    }
    bodyBase = palette[bodyIdx]!;
    borderBase = palette[borderIdx]!;
  } else {
    bodyBase = palette[0]!;
    borderBase = palette[0]!;
  }

  return {
    labelFillColor: tintToRgba(lightenTint(bodyBase, 0.38), 0.95),
    labelStrokeColor: tintToRgba(darkenTint(borderBase, 0.68), 0.92),
  };
}
