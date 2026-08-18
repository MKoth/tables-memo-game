import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { createRng, hashSeedString } from './seededRandom';
import { generateScatterConfigs, type GenerateScatterInput } from './generateScatterConfigs';
import type { ScatterConfig, ScatterTint } from './types';

export type UseScatterConfigsOptions = {
  count: number;
  variantCount: number;
  minSize: number;
  maxSize: number;
  minRotation?: number;
  maxRotation?: number;
  margin?: number;
  minDistance: number;
  ovalWidth?: number;
  ovalHeight?: number;
  ovalInsideProbability?: number;
  tints?: readonly ScatterTint[];
  tintStrength?: number;
  minBrightness?: number;
  maxBrightness?: number;
  minOpacity?: number;
  maxOpacity?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowScale?: number;
  shadowOpacity?: number;
  shadowColor?: ScatterTint;
  seed?: string;
};

export function useScatterConfigs(
  options: UseScatterConfigsOptions,
): ScatterConfig[] {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    if (width === 0 || height === 0) {
      return [];
    }

    const input: GenerateScatterInput = {
      screenWidth: width,
      screenHeight: height,
      rng: createRng(hashSeedString(options.seed ?? 'swamp-scatter-v1')),
      count: options.count,
      variantCount: Math.min(options.variantCount, 6),
      minSize: options.minSize,
      maxSize: options.maxSize,
      minRotation: options.minRotation ?? -0.35,
      maxRotation: options.maxRotation ?? 0.35,
      margin: options.margin ?? 1,
      minDistance: options.minDistance,
      ovalWidth: options.ovalWidth ?? 0,
      ovalHeight: options.ovalHeight ?? 0,
      ovalInsideProbability: options.ovalInsideProbability ?? 0.5,
      tints: options.tints ?? [],
      tintStrength: options.tintStrength ?? 0,
      minBrightness: options.minBrightness ?? 0.92,
      maxBrightness: options.maxBrightness ?? 1,
      minOpacity: options.minOpacity ?? 1,
      maxOpacity: options.maxOpacity ?? 1,
      shadowOffsetX: options.shadowOffsetX ?? -2,
      shadowOffsetY: options.shadowOffsetY ?? 4,
      shadowScale: options.shadowScale ?? 1.05,
      shadowOpacity: options.shadowOpacity ?? 0.3,
      shadowColor: options.shadowColor ?? [0.02, 0.03, 0.05],
    };

    return generateScatterConfigs(input);
  }, [
    width,
    height,
    options.count,
    options.variantCount,
    options.minSize,
    options.maxSize,
    options.minRotation,
    options.maxRotation,
    options.margin,
    options.minDistance,
    options.ovalWidth,
    options.ovalHeight,
    options.ovalInsideProbability,
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
    options.seed,
  ]);
}
