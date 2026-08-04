export const ROSE_LEAF_REGIONS: readonly [number, number, number, number][] = [
  [0, 0, 32, 52],
  [0, 52, 32, 52],
  [0, 104, 32, 53],
  [0, 157, 31, 53],
] as const;

export const ROSE_LEAF_ATLAS_FLAT_REGIONS: readonly number[] = (() => {
  const flat: number[] = [];
  for (const r of ROSE_LEAF_REGIONS) {
    flat.push(r[0], r[1], r[2], r[3]);
  }
  return flat;
})();

export const ROSE_LEAF_ATLAS_WIDTH = 32 as const;
export const ROSE_LEAF_ATLAS_HEIGHT = 210 as const;
