export const MAX_GROUND_SPRITE_VARIANTS = 6;

export type GroundScatterKind = 'even' | 'edge' | 'band';

export type GroundScatterTint = readonly [number, number, number];

export type GroundScatterConfig = {
  spriteId: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  variant: number;
  opacity: number;
  brightness: number;
  tint: GroundScatterTint | null;
  tintStrength: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowScale: number;
  shadowOpacity: number;
  shadowColor: GroundScatterTint;
};
