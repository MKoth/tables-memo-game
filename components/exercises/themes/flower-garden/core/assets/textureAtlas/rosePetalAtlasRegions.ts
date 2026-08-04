export const ROSE_PETAL_REGIONS: readonly [number, number, number, number][] = [
  [0, 0, 66, 65],
  [0, 65, 57, 66],
  [0, 131, 66, 65],
  [0, 196, 59, 66],
  [0, 262, 64, 66],
  [0, 328, 65, 66],
] as const;

export const ROSE_PETAL_ATLAS_FLAT_REGIONS: readonly number[] = (() => {
  const flat: number[] = [];
  for (const r of ROSE_PETAL_REGIONS) {
    flat.push(r[0], r[1], r[2], r[3]);
  }
  return flat;
})();

export const ROSE_PETAL_ATLAS_WIDTH = 66 as const;
export const ROSE_PETAL_ATLAS_HEIGHT = 394 as const;
