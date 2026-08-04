import { MAX_PETALS, MAX_RINGS } from '../../../shaders/roseBudDeform.sksl';

export type RoseBudRingHashes = {
  ringHashBorder: number[];
  ringHashWidth: number[];
};

function fract(x: number): number {
  return x - Math.floor(x);
}

function ringHash(a: number, b: number, c: number, seed: number): number {
  return fract(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719 + seed * 51.137) * 43758.5453);
}

export function computeRoseBudRingHashes(seed: number): RoseBudRingHashes {
  'worklet';
  const ringHashBorder: number[] = [];
  const ringHashWidth: number[] = [];
  for (let ring = 0; ring < MAX_RINGS; ring++) {
    for (let petal = 0; petal < MAX_PETALS; petal++) {
      ringHashBorder.push(ringHash(ring, petal, 0, seed));
      ringHashWidth.push(ringHash(ring, petal, 1, seed));
    }
  }
  return { ringHashBorder, ringHashWidth };
}
