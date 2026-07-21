export type LeafSide = -1 | 1;

export type LeafConfig = {
  t: number;
  side: LeafSide;
  tilt: number;
  variant: 0 | 1 | 2 | 3;
  size: number;
};

export type StemConfig = {
  roseIndex: number;
  baseX: number;
  baseY: number;
  topX: number;
  topY: number;
  controlX: number;
  controlY: number;
  baseWidth: number;
  topWidth: number;
  leaves: LeafConfig[];
};

export type BushConfig = {
  bushId: number;
  baseX: number;
  baseY: number;
  stems: StemConfig[];
};

export const MAX_STEMS_PER_BUSH = 5;
export const MAX_LEAVES_PER_STEM = 9;

export type BushUniforms = {
  stemBaseX: number[];
  stemBaseY: number[];
  stemControlX: number[];
  stemControlY: number[];
  stemBaseWidth: number[];
  stemTopWidth: number[];
  stemCalyxSize: number[];
  stemLeafCount: number[];
  restX: number[];
  restY: number[];
  layoutX: number[];
  layoutY: number[];
  layoutScale: number[];
  leafT: number[];
  leafSide: number[];
  leafTilt: number[];
  leafVariant: number[];
  leafSize: number[];
  stemCount: number;
};
