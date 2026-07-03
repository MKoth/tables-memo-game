import type { RefObject } from 'react';
import type { UnderseaThemeSoundController } from '../../core/assets/useUnderseaThemeSounds';

export const BUBBLE_DIAMETER_RATIO = 0.9;

export type BubbleSelection = {
  word: string;
  fishIndex: number;
  originX: number;
  originY: number;
};

export type KoiSwimZoneBubbleTarget = {
  centerX: number;
  centerY: number;
  diameter?: number;
};

export type KoiSwimZoneController = {
  /** Returns the fish index assigned to `word`, or -1 if not found. */
  getFishIndexForWord: (word: string) => number;
  /** Programmatically capture the koi carrying `word` at its current position. */
  armCaptureByWord: (word: string) => boolean;
  /** Trigger escape toward a jellyfish position (requires an active capture). */
  dispatchEscapeTo: (targetX: number, targetY: number, hitIdx?: number) => void;
};

export type { KoiCaptureBridge } from '../../core/types/bridgeTypes';

export type KoiSwimZoneProps = {
  words: string[];
  interactive?: boolean;
  sounds?: UnderseaThemeSoundController;
  /** When false, fish taps are ignored even if `interactive` is true. */
  captureEnabled?: boolean;
  /** Override where the capture bubble travels (defaults to koi zone center). */
  bubbleTarget?: KoiSwimZoneBubbleTarget;
  controllerRef?: RefObject<KoiSwimZoneController | null>;
};
