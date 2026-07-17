import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export type RoamerRuntimePosition = {
  x: SharedValue<number>;
  y: SharedValue<number>;
};

export type RoamerSimBridge = {
  runtimePositions: ReadonlyArray<RoamerRuntimePosition>;
  roamerCount: number;
  hitRadius: number;
  eliminatedRoamerSv: SharedValue<number[]>;
};

export type WordSpriteLayoutBridge = {
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  bodyCellIndices: number[];
  headerCellIndices: number[];
  bodySizes: number[];
};

export type RoamerCaptureBridge = {
  capturedWord: string | null;
  orbPhase: SharedValue<number>;
  onMatchSuccess: (targetX: number, targetY: number, hitIdx: number) => void;
  overlay: ReactNode | null;
  escapeOverlayActive: boolean;
};

export type TutorialStep = 'idle' | 'roamer' | 'wordSprite' | 'translate';
