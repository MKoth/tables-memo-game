import { createRng } from '../../BushShaderLayer/helpers/seededRandom';
import {
  cullGroundScatterConfigs,
  generateGroundScatterConfigs,
  validateGroundScatterConfigs,
  type GenerateGroundScatterConfigsInput,
} from '../generateGroundScatterConfigs';

const SCREEN_W = 400;
const SCREEN_H = 800;

function buildInput(
  overrides: Partial<GenerateGroundScatterConfigsInput> = {},
): GenerateGroundScatterConfigsInput {
  return {
    kind: overrides.kind ?? 'even',
    screenWidth: overrides.screenWidth ?? SCREEN_W,
    screenHeight: overrides.screenHeight ?? SCREEN_H,
    rng: overrides.rng ?? createRng(0xc0ffee),
    count: overrides.count ?? 5,
    variantCount: overrides.variantCount ?? 6,
    minSize: overrides.minSize ?? 20,
    maxSize: overrides.maxSize ?? 60,
    minRotation: overrides.minRotation ?? -0.3,
    maxRotation: overrides.maxRotation ?? 0.3,
    margin: overrides.margin ?? 10,
    minDistance: overrides.minDistance ?? 60,
    edgeWeights: overrides.edgeWeights ?? [0.35, 0.35, 0.05, 0.25],
    edgeBandFalloff: overrides.edgeBandFalloff ?? 55,
    maxEdgeDistance: overrides.maxEdgeDistance ?? 160,
    clusterProbability: overrides.clusterProbability ?? 0.65,
    minClusterSize: overrides.minClusterSize ?? 2,
    maxClusterSize: overrides.maxClusterSize ?? 4,
    clusterRadiusMin: overrides.clusterRadiusMin ?? 12,
    clusterRadiusMax: overrides.clusterRadiusMax ?? 26,
    zone: overrides.zone ?? null,
    tints: overrides.tints ?? [],
    tintStrength: overrides.tintStrength ?? 0,
    minBrightness: overrides.minBrightness ?? 1,
    maxBrightness: overrides.maxBrightness ?? 1,
    minOpacity: overrides.minOpacity ?? 1,
    maxOpacity: overrides.maxOpacity ?? 1,
    shadowOffsetX: overrides.shadowOffsetX ?? -2,
    shadowOffsetY: overrides.shadowOffsetY ?? 4,
    shadowScale: overrides.shadowScale ?? 1.05,
    shadowOpacity: overrides.shadowOpacity ?? 0.3,
    shadowColor: overrides.shadowColor ?? [0.02, 0.03, 0.05],
  };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('generateGroundScatterConfigs', () => {
  it('produces the requested count', () => {
    const configs = generateGroundScatterConfigs(buildInput({ count: 5 }));
    expect(configs).toHaveLength(5);
  });

  it('returns empty array for count=0', () => {
    const configs = generateGroundScatterConfigs(buildInput({ count: 0 }));
    expect(configs).toHaveLength(0);
  });

  it('places every even sprite inside the screen bounds', () => {
    const configs = generateGroundScatterConfigs(buildInput({ count: 20 }));
    for (const config of configs) {
      expect(config.x).toBeGreaterThanOrEqual(0);
      expect(config.x).toBeLessThanOrEqual(SCREEN_W);
      expect(config.y).toBeGreaterThanOrEqual(0);
      expect(config.y).toBeLessThanOrEqual(SCREEN_H);
    }
  });

  it('enforces minDistance between even sprites', () => {
    const minDist = 70;
    const configs = generateGroundScatterConfigs(buildInput({ count: 8, minDistance: minDist }));
    for (let i = 0; i < configs.length; i++) {
      for (let j = i + 1; j < configs.length; j++) {
        expect(distance(configs[i]!, configs[j]!)).toBeGreaterThanOrEqual(minDist - 0.5);
      }
    }
  });

  it('keeps every edge sprite inside the edge band', () => {
    const maxEdgeDistance = 120;
    const configs = generateGroundScatterConfigs(
      buildInput({
        kind: 'edge',
        count: 20,
        maxEdgeDistance,
        clusterRadiusMax: 0,
        clusterProbability: 0,
      }),
    );
    for (const config of configs) {
      const edgeDist = Math.min(
        config.x,
        SCREEN_W - config.x,
        config.y,
        SCREEN_H - config.y,
      );
      expect(edgeDist).toBeLessThanOrEqual(maxEdgeDistance + 10 + 0.5);
    }
  });

  it('keeps cluster members tightly grouped', () => {
    const clusterRadiusMax = 30;
    const configs = generateGroundScatterConfigs(
      buildInput({
        kind: 'edge',
        count: 8,
        clusterProbability: 1,
        minClusterSize: 2,
        maxClusterSize: 4,
        clusterRadiusMin: 10,
        clusterRadiusMax,
      }),
    );
    expect(configs).toHaveLength(8);
    for (const config of configs) {
      const hasNeighbor = configs.some(
        other => other.spriteId !== config.spriteId && distance(config, other) <= clusterRadiusMax * 2,
      );
      expect(hasNeighbor).toBe(true);
    }
  });

  it('clamps cluster members into the screen even with a large cluster radius', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const configs = generateGroundScatterConfigs(
        buildInput({
          kind: 'edge',
          count: 12,
          clusterProbability: 1,
          minClusterSize: 2,
          maxClusterSize: 6,
          clusterRadiusMin: 40,
          clusterRadiusMax: 40,
          rng: createRng(seed),
        }),
      );
      expect(configs).toHaveLength(12);
      for (const config of configs) {
        expect(config.x).toBeGreaterThanOrEqual(0);
        expect(config.x).toBeLessThanOrEqual(SCREEN_W);
        expect(config.y).toBeGreaterThanOrEqual(0);
        expect(config.y).toBeLessThanOrEqual(SCREEN_H);
      }
    }
  });

  it('keeps every band sprite inside the zone', () => {
    const zone = { x: 50, y: 500, w: 300, h: 150 };
    const configs = generateGroundScatterConfigs(
      buildInput({ kind: 'band', count: 8, zone }),
    );
    for (const config of configs) {
      expect(config.x).toBeGreaterThanOrEqual(zone.x);
      expect(config.x).toBeLessThanOrEqual(zone.x + zone.w);
      expect(config.y).toBeGreaterThanOrEqual(zone.y);
      expect(config.y).toBeLessThanOrEqual(zone.y + zone.h);
    }
  });

  it('keeps variant within variantCount', () => {
    const configs = generateGroundScatterConfigs(buildInput({ count: 10, variantCount: 4 }));
    for (const config of configs) {
      expect(config.variant).toBeGreaterThanOrEqual(0);
      expect(config.variant).toBeLessThan(4);
    }
  });

  it('assigns a tint only when tints are provided', () => {
    const tinted = generateGroundScatterConfigs(
      buildInput({ kind: 'band', count: 5, tints: [[1, 0, 0]], tintStrength: 1 }),
    );
    for (const config of tinted) {
      expect(config.tint).toEqual([1, 0, 0]);
      expect(config.tintStrength).toBeGreaterThan(0);
    }
    const neutral = generateGroundScatterConfigs(buildInput({ count: 5 }));
    for (const config of neutral) {
      expect(config.tint).toBeNull();
    }
  });

  it('carries shadow parameters through to every config', () => {
    const configs = generateGroundScatterConfigs(
      buildInput({
        count: 5,
        shadowOffsetX: -2,
        shadowOffsetY: 3,
        shadowScale: 1.05,
        shadowOpacity: 0.3,
        shadowColor: [0.02, 0.03, 0.05],
      }),
    );
    for (const config of configs) {
      expect(config.shadowOffsetX).toBe(-2);
      expect(config.shadowOffsetY).toBe(3);
      expect(config.shadowScale).toBe(1.05);
      expect(config.shadowOpacity).toBe(0.3);
      expect(config.shadowColor).toEqual([0.02, 0.03, 0.05]);
    }
  });

  it('validates generated configs without throwing', () => {
    const input = buildInput({ count: 6 });
    const configs = generateGroundScatterConfigs(input);
    expect(() => validateGroundScatterConfigs(configs, input)).not.toThrow();
  });

  it('uses edge weighting across all four edges', () => {
    const configs = generateGroundScatterConfigs(
      buildInput({
        kind: 'edge',
        count: 60,
        clusterProbability: 0,
        edgeWeights: [0.25, 0.25, 0.25, 0.25],
        maxEdgeDistance: 300,
      }),
    );
    const onEdges = { left: 0, right: 0, top: 0, bottom: 0 };
    for (const config of configs) {
      const dLeft = config.x;
      const dRight = SCREEN_W - config.x;
      const dTop = config.y;
      const dBottom = SCREEN_H - config.y;
      const min = Math.min(dLeft, dRight, dTop, dBottom);
      if (min === dLeft) onEdges.left++;
      else if (min === dRight) onEdges.right++;
      else if (min === dTop) onEdges.top++;
      else onEdges.bottom++;
    }
    for (const key of ['left', 'right', 'top', 'bottom'] as const) {
      expect(onEdges[key]).toBeGreaterThan(0);
    }
  });
});

describe('cullGroundScatterConfigs', () => {
  const fullViewport = { x: 0, y: 0, width: SCREEN_W, height: SCREEN_H };

  it('keeps all elements when viewport covers full screen', () => {
    const configs = generateGroundScatterConfigs(buildInput({ count: 10 }));
    const culled = cullGroundScatterConfigs(configs, fullViewport);
    expect(culled).toHaveLength(10);
  });

  it('returns empty array when all elements are outside viewport', () => {
    const configs = generateGroundScatterConfigs(buildInput({ count: 10 }));
    const culled = cullGroundScatterConfigs(configs, {
      x: SCREEN_W + 100,
      y: SCREEN_H + 100,
      width: 50,
      height: 50,
    });
    expect(culled).toHaveLength(0);
  });

  it('culls only the elements outside a partial viewport', () => {
    const configs = generateGroundScatterConfigs(
      buildInput({ kind: 'even', count: 20 }),
    );
    const partialVp = {
      x: 100,
      y: 200,
      width: 200,
      height: 400,
    };
    const culled = cullGroundScatterConfigs(configs, partialVp);
    for (const c of culled) {
      const halfSize = c.size * 0.5 * Math.max(1, c.shadowScale);
      expect(c.x + halfSize).toBeGreaterThan(partialVp.x);
      expect(c.x - halfSize).toBeLessThan(partialVp.x + partialVp.width);
      expect(c.y + halfSize).toBeGreaterThan(partialVp.y);
      expect(c.y - halfSize).toBeLessThan(partialVp.y + partialVp.height);
    }
    expect(culled.length).toBeLessThan(configs.length);
  });

  it('keeps elements that partially overlap the viewport edge', () => {
    const configs = generateGroundScatterConfigs(
      buildInput({ kind: 'even', count: 20 }),
    );
    const narrowVp = {
      x: SCREEN_W / 2 - 1,
      y: SCREEN_H / 2 - 1,
      width: 2,
      height: 2,
    };
    const culled = cullGroundScatterConfigs(configs, narrowVp);
    for (const c of culled) {
      const halfSize = c.size * 0.5 * Math.max(1, c.shadowScale);
      const overlaps =
        c.x + halfSize > narrowVp.x &&
        c.x - halfSize < narrowVp.x + narrowVp.width &&
        c.y + halfSize > narrowVp.y &&
        c.y - halfSize < narrowVp.y + narrowVp.height;
      expect(overlaps).toBe(true);
    }
  });

  it('returns empty array for empty input', () => {
    const culled = cullGroundScatterConfigs([], fullViewport);
    expect(culled).toHaveLength(0);
  });

  it('preserves relative order of surviving elements', () => {
    const configs = generateGroundScatterConfigs(
      buildInput({ kind: 'even', count: 20 }),
    );
    const culled = cullGroundScatterConfigs(configs, fullViewport);
    const ids = configs.map(c => c.spriteId);
    const culledIds = culled.map(c => c.spriteId);
    let ci = 0;
    for (const id of ids) {
      if (ci < culledIds.length && culledIds[ci] === id) {
        ci++;
      }
    }
    expect(ci).toBe(culledIds.length);
  });
});
