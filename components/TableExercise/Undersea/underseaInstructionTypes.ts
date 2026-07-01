import type { SharedValue } from 'react-native-reanimated';

export type KoiFishRuntimePosition = {
  x: SharedValue<number>;
  y: SharedValue<number>;
};

export type KoiSimBridge = {
  fishRuntimePositions: ReadonlyArray<KoiFishRuntimePosition>;
  fishCount: number;
  hitRadius: number;
  eliminatedFishSv: SharedValue<number[]>;
};

export type JellyfishLayoutBridge = {
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  bodyCellIndices: number[];
  headerCellIndices: number[];
  bellSizes: number[];
};

export type TutorialStep = 'idle' | 'fish' | 'jellyfish' | 'translate';
