export type RGB = readonly [number, number, number];
export type TintMode = 0 | 1 | 2;

const BODY_PALETTE: ReadonlyArray<RGB> = [
  [0.85, 0.55, 0.95],
  [0.55, 0.85, 1.0],
  [1.0, 0.7, 0.85],
  [0.9, 0.95, 1.1],
  [1.1, 0.85, 0.6],
  [0.7, 0.95, 0.75],
  [1.15, 0.75, 0.9],
  [0.6, 0.7, 1.15],
];

export const HEADER_ROW_A: RGB = [0.6, 0.85, 1.1];
export const HEADER_ROW_B: RGB = [0.45, 0.65, 1.0];
export const HEADER_COL_A: RGB = [0.85, 1.05, 0.6];
export const HEADER_COL_B: RGB = [0.65, 0.95, 0.5];

export function sr(a: number, b: number): number {
  let n = (a * 374761393 + b * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 0xffffffff;
}

export type TintSpawn = {
  tintMode: TintMode;
  tintStrength: number;
  tintA: RGB;
  tintB: RGB;
  tintC: RGB;
  animatedTint: boolean;
  tintWaveSpeed: number;
};

export function rollBodyTint(r: number, c: number): TintSpawn {
  const modeR = sr(r * 3 + 7, c * 5 + 11);
  const tintMode: TintMode = modeR < 0.35 ? 0 : modeR < 0.70 ? 1 : 2;
  const n = BODY_PALETTE.length;
  return {
    tintMode,
    tintStrength: 0.82 + sr(r + 300, c + 300) * 0.12,
    tintA: BODY_PALETTE[Math.floor(sr(r, c) * n)],
    tintB: BODY_PALETTE[Math.floor(sr(r + 100, c + 100) * n)],
    tintC: BODY_PALETTE[Math.floor(sr(r + 200, c + 200) * n)],
    animatedTint: tintMode > 0 && sr(r + 50, c + 50) < 0.45,
    tintWaveSpeed: 0.2 + sr(r + 150, c + 150) * 0.4,
  };
}

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

/** Pick label fill/stroke from jellyfish tints; body is lightened, border darkened. */
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
    bodyBase = palette[bodyIdx];
    borderBase = palette[borderIdx];
  } else {
    bodyBase = palette[0];
    borderBase = palette[0];
  }

  return {
    labelFillColor: tintToRgba(lightenTint(bodyBase, 0.38), 0.95),
    labelStrokeColor: tintToRgba(darkenTint(borderBase, 0.68), 0.92),
  };
}
