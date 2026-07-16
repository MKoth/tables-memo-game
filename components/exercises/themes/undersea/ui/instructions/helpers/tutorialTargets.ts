import type {
  RoamerSimBridge,
  WordSpriteLayoutBridge,
} from '../../../../../core/types/bridgeTypes';

export function pickRandomFishIndex(bridge: RoamerSimBridge): number | null {
  const eliminated = bridge.eliminatedFishSv.value;
  const eligible: number[] = [];
  for (let i = 0; i < bridge.fishCount; i++) {
    let isEliminated = false;
    for (let e = 0; e < eliminated.length; e++) {
      if (eliminated[e] === i) {
        isEliminated = true;
        break;
      }
    }
    if (!isEliminated) {
      eligible.push(i);
    }
  }
  if (eligible.length === 0) {
    return null;
  }
  return eligible[Math.floor(Math.random() * eligible.length)]!;
}

export function pickRandomJellyIndex(bridge: WordSpriteLayoutBridge): number | null {
  const { bodyCellIndices } = bridge;
  if (bodyCellIndices.length === 0) {
    return null;
  }
  return bodyCellIndices[Math.floor(Math.random() * bodyCellIndices.length)]!;
}

export function pickRandomHeaderJellyIndex(bridge: WordSpriteLayoutBridge): number | null {
  const { headerCellIndices } = bridge;
  if (headerCellIndices.length === 0) {
    return null;
  }
  return headerCellIndices[Math.floor(Math.random() * headerCellIndices.length)]!;
}
