import { MAX_RINGS, roseBudUniformDefaults } from '../../../shaders/roseBudDeform.sksl';

export type RoseRingRotations = {
  ringRotCos: number[];
  ringRotSin: number[];
};

export function computeRoseRingRotations(coefficient: number): RoseRingRotations {
  'worklet';
  const ringRotCos: number[] = [];
  const ringRotSin: number[] = [];
  for (let i = 0; i < MAX_RINGS; i++) {
    const min = roseBudUniformDefaults.ringRotation.min[i] ?? 0;
    const max = roseBudUniformDefaults.ringRotation.max[i] ?? 0;
    const angle = (1 - coefficient) * min + coefficient * max;
    ringRotCos.push(Math.cos(angle));
    ringRotSin.push(Math.sin(angle));
  }
  return { ringRotCos, ringRotSin };
}
