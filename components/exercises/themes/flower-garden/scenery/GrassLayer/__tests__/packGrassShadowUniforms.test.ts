import { createRng } from '../../BushShaderLayer/helpers/seededRandom';
import { generateGrassConfigs } from '../generateGrassConfigs';
import { packGrassShadowUniforms } from '../packGrassShadowUniforms';
import { DEFAULT_GRASS_CONFIG_PARAMS, MAX_GRASS_ELEMENTS } from '../types';

const SCREEN_W = 390;
const SCREEN_H = 844;

const DEFAULT_PARAMS = { ...DEFAULT_GRASS_CONFIG_PARAMS, clustersPerScreen: 5, maxGrassPerCluster: 5 };

describe('packGrassShadowUniforms', () => {
  it('returns output arrays of length MAX_GRASS_ELEMENTS', () => {
    const configs = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(42), DEFAULT_PARAMS);
    const result = packGrassShadowUniforms(configs, SCREEN_W, SCREEN_H, DEFAULT_PARAMS);

    expect(result.shadowAngles.length).toBe(MAX_GRASS_ELEMENTS);
    expect(result.shadowLengths.length).toBe(MAX_GRASS_ELEMENTS);
    expect(result.shadowOpacities.length).toBe(MAX_GRASS_ELEMENTS);
  });

  it('sets elementCount to the total number of grass elements', () => {
    const configs = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(42), DEFAULT_PARAMS);
    const totalElements = configs.reduce((sum, c) => sum + c.elements.length, 0);
    const result = packGrassShadowUniforms(configs, SCREEN_W, SCREEN_H, DEFAULT_PARAMS);

    expect(result.elementCount).toBe(totalElements);
  });

  it('computes shadow angle as element inclineAngle + horizontal-offset amplification', () => {
    const configs = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(42), DEFAULT_PARAMS);
    const halfWidth = SCREEN_W / 2;
    const result = packGrassShadowUniforms(configs, SCREEN_W, SCREEN_H, DEFAULT_PARAMS);

    let idx = 0;
    for (const cluster of configs) {
      const clusterOffset =
        ((cluster.clusterX - halfWidth) / halfWidth) * DEFAULT_PARAMS.shadowAngleIntensity;
      for (const element of cluster.elements) {
        const expectedAngle = element.inclineAngle + clusterOffset;
        expect(result.shadowAngles[idx]).toBeCloseTo(expectedAngle);
        idx++;
      }
    }
  });

  it('computes shadow length as element size * shadowLengthRatio', () => {
    const configs = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(42), DEFAULT_PARAMS);
    const result = packGrassShadowUniforms(configs, SCREEN_W, SCREEN_H, DEFAULT_PARAMS);

    let idx = 0;
    for (const cluster of configs) {
      for (const element of cluster.elements) {
        const expectedLength = element.size * DEFAULT_PARAMS.shadowLengthRatio;
        expect(result.shadowLengths[idx]).toBeCloseTo(expectedLength);
        idx++;
      }
    }
  });

  it('uses params.shadowOpacity for every element', () => {
    const configs = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(42), DEFAULT_PARAMS);
    const result = packGrassShadowUniforms(configs, SCREEN_W, SCREEN_H, DEFAULT_PARAMS);

    let idx = 0;
    for (const cluster of configs) {
      for (let j = 0; j < cluster.elements.length; j++) {
        expect(result.shadowOpacities[idx]).toBe(DEFAULT_PARAMS.shadowOpacity);
        idx++;
      }
    }
  });

  it('zeros out unused uniform slots beyond elementCount', () => {
    const configs = generateGrassConfigs(SCREEN_W, SCREEN_H, createRng(42), DEFAULT_PARAMS);
    const totalElements = configs.reduce((sum, c) => sum + c.elements.length, 0);
    const result = packGrassShadowUniforms(configs, SCREEN_W, SCREEN_H, DEFAULT_PARAMS);

    for (let i = totalElements; i < MAX_GRASS_ELEMENTS; i++) {
      expect(result.shadowAngles[i]).toBe(0);
      expect(result.shadowLengths[i]).toBe(0);
      expect(result.shadowOpacities[i]).toBe(0);
    }
  });

  it('works with an empty configs array', () => {
    const result = packGrassShadowUniforms([], SCREEN_W, SCREEN_H, DEFAULT_PARAMS);
    expect(result.elementCount).toBe(0);
    expect(result.shadowAngles.length).toBe(MAX_GRASS_ELEMENTS);
    expect(result.shadowAngles.every(v => v === 0)).toBe(true);
    expect(result.shadowLengths.every(v => v === 0)).toBe(true);
    expect(result.shadowOpacities.every(v => v === 0)).toBe(true);
  });
});
