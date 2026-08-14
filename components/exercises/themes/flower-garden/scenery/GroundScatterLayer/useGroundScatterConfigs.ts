import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useExerciseLayout } from '../../../../core';
import { createRng, hashSeedString } from '../BushShaderLayer/helpers/seededRandom';
import { computeGroundBand } from '../BushShaderLayer/groundBand';
import { ROSE_TINT_PRESETS } from '../../carrier/FlowerGardenWordSpriteTableLayer/presets/roseTintPresets';
import {
  cullGroundScatterConfigs,
  generateGroundScatterConfigs,
  type CullViewport,
  type GenerateGroundScatterConfigsInput,
  type GroundScatterZoneRect,
} from './generateGroundScatterConfigs';
import type { GroundScatterConfig, GroundScatterKind, GroundScatterTint } from './types';

export const DEFAULT_STONE_COUNT = 24;
export const DEFAULT_STONE_MIN_SIZE = 26;
export const DEFAULT_STONE_MAX_SIZE = 92;
export const DEFAULT_STONE_MARGIN = 1;
export const DEFAULT_STONE_MIN_DISTANCE = 70;

export const DEFAULT_CLOVER_COUNT = 250;
export const DEFAULT_CLOVER_MIN_SIZE = 26;
export const DEFAULT_CLOVER_MAX_SIZE = 48;
export const DEFAULT_CLOVER_MARGIN = 0;
export const DEFAULT_CLOVER_MIN_DISTANCE = 60;
export const DEFAULT_CLOVER_EDGE_WEIGHTS: readonly [number, number, number, number] = [
  0.95,
  0.95,
  0.95,
  0.95,
];
export const DEFAULT_CLOVER_EDGE_BAND_FALLOFF = 55;
export const DEFAULT_CLOVER_MAX_EDGE_DISTANCE = 160;
export const DEFAULT_CLOVER_CLUSTER_PROBABILITY = 0.65;
export const DEFAULT_CLOVER_MIN_CLUSTER_SIZE = 2;
export const DEFAULT_CLOVER_MAX_CLUSTER_SIZE = 4;
export const DEFAULT_CLOVER_CLUSTER_RADIUS_MIN = 12;
export const DEFAULT_CLOVER_CLUSTER_RADIUS_MAX = 26;

export const DEFAULT_PETAL_COUNT = 60;
export const DEFAULT_PETAL_MIN_SIZE = 12;
export const DEFAULT_PETAL_MAX_SIZE = 17;
export const DEFAULT_PETAL_MIN_DISTANCE = 34;
export const DEFAULT_PETAL_BAND_HEIGHT_FRACTION = 0.22;

export const GROUND_DECOR_TINTS: readonly GroundScatterTint[] = Object.values(ROSE_TINT_PRESETS);

export type UseGroundScatterConfigsOptions = {
  kind: GroundScatterKind;
  variantCount?: number;
  count?: number;
  minSize?: number;
  maxSize?: number;
  minRotation?: number;
  maxRotation?: number;
  margin?: number;
  minDistance?: number;
  edgeWeights?: readonly [number, number, number, number];
  edgeBandFalloff?: number;
  maxEdgeDistance?: number;
  clusterProbability?: number;
  minClusterSize?: number;
  maxClusterSize?: number;
  clusterRadiusMin?: number;
  clusterRadiusMax?: number;
  bandHeightFraction?: number;
  tints?: readonly GroundScatterTint[];
  tintStrength?: number;
  minBrightness?: number;
  maxBrightness?: number;
  minOpacity?: number;
  maxOpacity?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowScale?: number;
  shadowOpacity?: number;
  shadowColor?: GroundScatterTint;
  viewportRect?: CullViewport | null;
  /** When provided, replaces the computed petal band zone entirely. */
  bandZone?: GroundScatterZoneRect | null;
};

const NEUTRAL_TINT_STRENGTH = 0;
const NEUTRAL_BRIGHTNESS_MIN = 0.92;
const NEUTRAL_BRIGHTNESS_MAX = 1;
const NEUTRAL_OPACITY_MIN = 1;
const NEUTRAL_OPACITY_MAX = 1;

const PETAL_TINT_STRENGTH = 1;
const PETAL_BRIGHTNESS_MIN = 0.85;
const PETAL_BRIGHTNESS_MAX = 1.05;
const PETAL_OPACITY = 1;

const SHADOW_SCALE = 1.05;
const SHADOW_OPACITY = 0.3;
const SHADOW_COLOR: GroundScatterTint = [0.02, 0.03, 0.05];

export function useGroundScatterConfigs(
  options: UseGroundScatterConfigsOptions,
): GroundScatterConfig[] {
  const { width, height } = useWindowDimensions();
  const { spriteRect, screenHeight } = useExerciseLayout();

  const kind = options.kind;

  return useMemo(() => {
    if (width === 0 || height === 0 || screenHeight === 0) {
      return [];
    }

    const isBand = kind === 'band';
    const isStone = kind === 'even';

    const margin = options.margin ?? (isStone ? DEFAULT_STONE_MARGIN : DEFAULT_CLOVER_MARGIN);
    const count = options.count ?? (isStone ? DEFAULT_STONE_COUNT : isBand ? DEFAULT_PETAL_COUNT : DEFAULT_CLOVER_COUNT);
    const minSize = options.minSize ?? (isStone ? DEFAULT_STONE_MIN_SIZE : isBand ? DEFAULT_PETAL_MIN_SIZE : DEFAULT_CLOVER_MIN_SIZE);
    const maxSize = options.maxSize ?? (isStone ? DEFAULT_STONE_MAX_SIZE : isBand ? DEFAULT_PETAL_MAX_SIZE : DEFAULT_CLOVER_MAX_SIZE);
    const minDistance = options.minDistance ?? (isStone ? DEFAULT_STONE_MIN_DISTANCE : isBand ? DEFAULT_PETAL_MIN_DISTANCE : DEFAULT_CLOVER_MIN_DISTANCE);

    const zone =
      isBand && options.bandZone != null
        ? options.bandZone
        : isBand && spriteRect != null
          ? (() => {
              const bandHeightAbove = screenHeight * (options.bandHeightFraction ?? DEFAULT_PETAL_BAND_HEIGHT_FRACTION);
              const groundBand = computeGroundBand(spriteRect, screenHeight);
              const zoneY = groundBand.y - bandHeightAbove;
              const zoneBottom = Math.min(groundBand.y + groundBand.h, screenHeight);
              return {
                x: spriteRect.x,
                y: zoneY,
                w: spriteRect.w,
                h: Math.max(0, zoneBottom - zoneY),
              };
            })()
          : null;

    const input: GenerateGroundScatterConfigsInput = {
      kind,
      screenWidth: width,
      screenHeight: height,
      rng: createRng(hashSeedString(`ground-decor-${kind}-v1`)),
      count,
      variantCount: options.variantCount ?? 6,
      minSize,
      maxSize,
      minRotation: options.minRotation ?? (isBand ? -Math.PI : isStone ? -0.35 : -0.9),
      maxRotation: options.maxRotation ?? (isBand ? Math.PI : isStone ? 0.35 : 0.9),
      margin,
      minDistance,
      edgeWeights: options.edgeWeights ?? DEFAULT_CLOVER_EDGE_WEIGHTS,
      edgeBandFalloff: options.edgeBandFalloff ?? DEFAULT_CLOVER_EDGE_BAND_FALLOFF,
      maxEdgeDistance: options.maxEdgeDistance ?? DEFAULT_CLOVER_MAX_EDGE_DISTANCE,
      clusterProbability: options.clusterProbability ?? DEFAULT_CLOVER_CLUSTER_PROBABILITY,
      minClusterSize: options.minClusterSize ?? DEFAULT_CLOVER_MIN_CLUSTER_SIZE,
      maxClusterSize: options.maxClusterSize ?? DEFAULT_CLOVER_MAX_CLUSTER_SIZE,
      clusterRadiusMin: options.clusterRadiusMin ?? DEFAULT_CLOVER_CLUSTER_RADIUS_MIN,
      clusterRadiusMax: options.clusterRadiusMax ?? DEFAULT_CLOVER_CLUSTER_RADIUS_MAX,
      zone,
      tints: options.tints ?? (isBand ? GROUND_DECOR_TINTS : []),
      tintStrength: options.tintStrength ?? (isBand ? PETAL_TINT_STRENGTH : NEUTRAL_TINT_STRENGTH),
      minBrightness: options.minBrightness ?? (isBand ? PETAL_BRIGHTNESS_MIN : NEUTRAL_BRIGHTNESS_MIN),
      maxBrightness: options.maxBrightness ?? (isBand ? PETAL_BRIGHTNESS_MAX : NEUTRAL_BRIGHTNESS_MAX),
      minOpacity: options.minOpacity ?? (isBand ? PETAL_OPACITY : NEUTRAL_OPACITY_MIN),
      maxOpacity: options.maxOpacity ?? (isBand ? PETAL_OPACITY : NEUTRAL_OPACITY_MAX),
      shadowOffsetX: options.shadowOffsetX ?? (isStone ? -2 : isBand ? 0 : -2),
      shadowOffsetY: options.shadowOffsetY ?? (isStone ? 4 : isBand ? 0 : 3),
      shadowScale: options.shadowScale ?? SHADOW_SCALE,
      shadowOpacity: options.shadowOpacity ?? (isBand ? 0 : SHADOW_OPACITY),
      shadowColor: options.shadowColor ?? SHADOW_COLOR,
    };

    const configs = generateGroundScatterConfigs(input);

    if (options.viewportRect) {
      return cullGroundScatterConfigs(configs, options.viewportRect);
    }
    return configs;
  }, [
    kind,
    width,
    height,
    screenHeight,
    spriteRect,
    options.variantCount,
    options.count,
    options.minSize,
    options.maxSize,
    options.minRotation,
    options.maxRotation,
    options.margin,
    options.minDistance,
    options.edgeWeights,
    options.edgeBandFalloff,
    options.maxEdgeDistance,
    options.clusterProbability,
    options.minClusterSize,
    options.maxClusterSize,
    options.clusterRadiusMin,
    options.clusterRadiusMax,
    options.bandHeightFraction,
    options.tints,
    options.tintStrength,
    options.minBrightness,
    options.maxBrightness,
    options.minOpacity,
    options.maxOpacity,
    options.shadowOffsetX,
    options.shadowOffsetY,
    options.shadowScale,
    options.shadowOpacity,
    options.shadowColor,
    options.viewportRect,
    options.bandZone,
  ]);
}
