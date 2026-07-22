import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { generateGrassConfigs } from './generateGrassConfigs';
import { DEFAULT_GRASS_CONFIG_PARAMS } from './types';

export function useGrassConfigs() {
  const { width, height } = useWindowDimensions();
  return useMemo(
    () => generateGrassConfigs(width, height, Math.random, DEFAULT_GRASS_CONFIG_PARAMS),
    [width, height],
  );
}
