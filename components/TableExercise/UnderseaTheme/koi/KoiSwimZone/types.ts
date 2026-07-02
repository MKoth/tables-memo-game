import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { UnderseaThemeSoundController } from '../../core/assets/useUnderseaThemeSounds';
import type { KoiSimBridge } from '../../core/types/tutorialTypes';

export const BUBBLE_DIAMETER_RATIO = 0.9;

export type BubbleSelection = {
  word: string;
  fishIndex: number;
  originX: number;
  originY: number;
};

export type KoiCaptureBridge = {
  capturedWord: string | null;
  bubblePhase: SharedValue<number>;
  onMatchSuccess: (targetX: number, targetY: number, hitIdx: number) => void;
  overlay: ReactNode | null;
  escapeOverlayActive: boolean;
};

export type KoiSwimZoneProps = {
  words: string[];
  interactive?: boolean;
  sounds?: UnderseaThemeSoundController;
  onCaptureBridgeChange?: (bridge: KoiCaptureBridge | null) => void;
  onSimBridgeChange?: (bridge: KoiSimBridge | null) => void;
};
