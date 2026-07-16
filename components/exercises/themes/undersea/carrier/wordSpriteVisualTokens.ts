export type RGB = readonly [number, number, number];
export type TintMode = 0 | 1 | 2;

/** Reference body bell size used for wordSprite label font scaling. */
export const REFERENCE_BODY_BELL_SIZE = 55;

export function computeWordSpriteFontScale(bellSize: number): number {
  return bellSize / REFERENCE_BODY_BELL_SIZE;
}

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

export function rollBodyTint(r: number, c?: number): TintSpawn {
  const col = c ?? 0;
  const modeR = sr(r * 3 + 7, col * 5 + 11);
  const tintMode: TintMode = modeR < 0.35 ? 0 : modeR < 0.70 ? 1 : 2;
  const n = BODY_PALETTE.length;
  return {
    tintMode,
    tintStrength: 0.82 + sr(r + 300, col + 300) * 0.12,
    tintA: BODY_PALETTE[Math.floor(sr(r, col) * n)]!,
    tintB: BODY_PALETTE[Math.floor(sr(r + 100, col + 100) * n)]!,
    tintC: BODY_PALETTE[Math.floor(sr(r + 200, col + 200) * n)]!,
    animatedTint: tintMode > 0 && sr(r + 50, col + 50) < 0.45,
    tintWaveSpeed: 0.2 + sr(r + 150, col + 150) * 0.4,
  };
}
