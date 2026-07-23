import { MAX_DANDELIONS, MAX_LEAVES_PER_DANDELION } from '../../shaders/dandelion.sksl';

export type LeafVariant = 0 | 1 | 2 | 3;

export type DandelionConfig = {
  dandelionId: number;
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

export type DandelionUniforms = {
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

export { MAX_DANDELIONS, MAX_LEAVES_PER_DANDELION };
