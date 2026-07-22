import { createRng } from '../../BushShaderLayer/helpers/seededRandom';
import { generateGrassConfigs } from '../generateGrassConfigs';
import { DEFAULT_GRASS_CONFIG_PARAMS } from '../types';

const SCREEN_W = 390;
const SCREEN_H = 844;

const DEFAULT_PARAMS = DEFAULT_GRASS_CONFIG_PARAMS;

function collectAllElements(
  configs: ReturnType<typeof generateGrassConfigs>,
) {
  return configs.flatMap(c => c.elements);
}

describe('generateGrassConfigs', () => {
  it('returns configs with cluster count equal to clustersPerScreen', () => {
    const configs = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(42), DEFAULT_PARAMS);
    expect(configs.length).toBe(DEFAULT_PARAMS.clustersPerScreen);
  });

  it('returns an empty array when screenWidth is 0', () => {
    const configs = generateGrassConfigs(0, SCREEN_H, createRng(42), DEFAULT_PARAMS);
    expect(configs).toEqual([]);
  });

  it('returns an empty array when screenHeight is 0', () => {
    const configs = generateGrassConfigs(SCREEN_W, 0, createRng(42), DEFAULT_PARAMS);
    expect(configs).toEqual([]);
  });

  it('keeps every cluster element count within [minGrassPerCluster, maxGrassPerCluster]', () => {
    const configs = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(42), DEFAULT_PARAMS);
    for (const cluster of configs) {
      expect(cluster.elements.length).toBeGreaterThanOrEqual(DEFAULT_PARAMS.minGrassPerCluster);
      expect(cluster.elements.length).toBeLessThanOrEqual(DEFAULT_PARAMS.maxGrassPerCluster);
    }
  });

  it('computes clusterBiasAngle with negative values on the left side and positive on the right', () => {
    const configs = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(42), DEFAULT_PARAMS);
    for (const cluster of configs) {
      const halfWidth = SCREEN_W / 2;
      const expectedBias = ((cluster.clusterX - halfWidth) / halfWidth) * DEFAULT_PARAMS.clusterAngleIntensity;
      expect(cluster.clusterBiasAngle).toBeCloseTo(expectedBias);
    }
  });

  it('computes clusterBiasAngle close to zero at screen centre', () => {
    const rng = createRng(1);
    const configs = generateGrassConfigs(SCREEN_W, SCREEN_H, rng, DEFAULT_PARAMS);
    const centreCluster = configs.find(c => Math.abs(c.clusterX - SCREEN_W / 2) < 10);
    if (centreCluster) {
      expect(Math.abs(centreCluster.clusterBiasAngle)).toBeLessThan(
        DEFAULT_PARAMS.clusterAngleIntensity / 2,
      );
    }
  });

  it('computes each element inclineAngle as elementRadialAngle + clusterBiasAngle', () => {
    const rng = createRng(42);
    const configs = generateGrassConfigs(SCREEN_W, SCREEN_H, rng, DEFAULT_PARAMS);
    for (const cluster of configs) {
      for (let j = 0; j < cluster.elements.length; j++) {
        const element = cluster.elements[j]!;
        const elementRadialAngle = (j / cluster.elements.length) * Math.PI * 2;
        const expectedIncline = elementRadialAngle + cluster.clusterBiasAngle;
        expect(element.inclineAngle).toBeCloseTo(expectedIncline);
      }
    }
  });

  it('keeps every element size within [elementMinSize, elementMaxSize]', () => {
    const configs = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(42), DEFAULT_PARAMS);
    const elements = collectAllElements(configs);
    for (const element of elements) {
      expect(element.size).toBeGreaterThanOrEqual(DEFAULT_PARAMS.elementMinSize);
      expect(element.size).toBeLessThanOrEqual(DEFAULT_PARAMS.elementMaxSize);
    }
  });

  it('cycles image variants in round-robin order across all elements and clusters', () => {
    const configs = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(42), DEFAULT_PARAMS);
    const elements = collectAllElements(configs);
    for (let i = 0; i < elements.length; i++) {
      expect(elements[i]!.imageVariant).toBe(i % 10);
    }
  });

  it('produces identical output for the same RNG seed', () => {
    const a = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(7), DEFAULT_PARAMS);
    const b = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(7), DEFAULT_PARAMS);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('produces different output for a different RNG seed', () => {
    const a = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(7), DEFAULT_PARAMS);
    const b = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(8), DEFAULT_PARAMS);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});
