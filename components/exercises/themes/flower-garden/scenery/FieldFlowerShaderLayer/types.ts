export const MAX_FIELD_FLOWERS = 8;
export const MAX_LEAVES_PER_FLOWER = 7;
export const MAX_LEAF_SLOTS = MAX_FIELD_FLOWERS * MAX_LEAVES_PER_FLOWER;
export const COVERING_SIZE = 200;

export type LeafVariant = 0 | 1 | 2 | 3;

export type FieldFlowerType = 'dandelion' | 'chamomile' | 'poppy' | 'wild_violet';

export type FieldFlowerConfig = {
  flowerId: number;
  flowerType: FieldFlowerType;
  headerX: number;
  headerY: number;
  offsetX: number;
  offsetY: number;
  offsetScale: number;
  stemBaseX: number;
  stemBaseY: number;
  stemBaseWidth: number;
  stemTopWidth: number;
  stemVariant: LeafVariant;
  flowerVariant: LeafVariant;
  leafCount: number;
  leafVariants: LeafVariant[];
  leafLengths: number[];
  leafWidths: number[];
  flowerSize: number;
  ringRotation: number;
  clusterShadowOffsetX: number;
  clusterShadowOffsetY: number;
  flowerTopShadowOffsetX: number;
  flowerTopShadowOffsetY: number;
};

export type FieldFlowerUniforms = {
  dandelionCount: number;
  headerX: number[];
  headerY: number[];
  offsetX: number[];
  offsetY: number[];
  offsetScale: number[];
  stemBaseX: number[];
  stemBaseY: number[];
  stemBaseWidth: number[];
  stemTopWidth: number[];
  stemVariant: number[];
  flowerVariant: number[];
  leafCount: number[];
  leafVariant: number[];
  perLeafLength: number[];
  perLeafWidth: number[];
  flowerSize: number[];
  ringRotation: number[];
  clusterShadowOffsetX: number[];
  clusterShadowOffsetY: number[];
  flowerTopShadowOffsetX: number[];
  flowerTopShadowOffsetY: number[];
};
