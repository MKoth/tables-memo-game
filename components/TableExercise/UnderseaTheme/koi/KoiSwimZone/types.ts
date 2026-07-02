import type { UnderseaThemeSoundController } from '../../core/assets/useUnderseaThemeSounds';

export const BUBBLE_DIAMETER_RATIO = 0.9;

export type BubbleSelection = {
  word: string;
  fishIndex: number;
  originX: number;
  originY: number;
};

export type { KoiCaptureBridge } from '../../core/types/bridgeTypes';

export type KoiSwimZoneProps = {
  words: string[];
  interactive?: boolean;
  sounds?: UnderseaThemeSoundController;
};
