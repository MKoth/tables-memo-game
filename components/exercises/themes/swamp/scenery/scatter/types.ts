export const MAX_SCATTER_VARIANTS = 6;

export type ScatterTint = readonly [number, number, number];

export type ScatterConfig = {
  spriteId: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  variant: number;
  opacity: number;
  brightness: number;
  tint: ScatterTint | null;
  tintStrength: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowScale: number;
  shadowOpacity: number;
  shadowColor: ScatterTint;
};
