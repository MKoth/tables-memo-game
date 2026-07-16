import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export type RoamerRuntimePosition = {
  x: SharedValue<number>;
  y: SharedValue<number>;
};

export type RoamerSimBridge = {
  fishRuntimePositions: ReadonlyArray<RoamerRuntimePosition>;
  fishCount: number;
  hitRadius: number;
  eliminatedFishSv: SharedValue<number[]>;
};

export type WordSpriteLayoutBridge = {
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  bodyCellIndices: number[];
  headerCellIndices: number[];
  bellSizes: number[];
};

export type RoamerCaptureBridge = {
  capturedWord: string | null;
  bubblePhase: SharedValue<number>;
  onMatchSuccess: (targetX: number, targetY: number, hitIdx: number) => void;
  overlay: ReactNode | null;
  escapeOverlayActive: boolean;
};

export type TutorialStep = 'idle' | 'roamer' | 'wordSprite' | 'translate';
