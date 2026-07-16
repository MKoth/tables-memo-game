import type { RefObject } from 'react';
import type { UnderseaThemeSoundController } from '../../core/assets/useUnderseaThemeSounds';

export const BUBBLE_DIAMETER_RATIO = 0.65;

export type BubbleSelection = {
  word: string;
  fishIndex: number;
  originX: number;
  originY: number;
};

export type RoamerSwimZoneBubbleTarget = {
  centerX: number;
  centerY: number;
  diameter?: number;
};

export type RoamerSwimZoneController = {
  /** Returns the fish index assigned to `word`, or -1 if not found. */
  getFishIndexForWord: (word: string) => number;
  /** Programmatically capture the roamer carrying `word` at its current position. */
  armCaptureByWord: (word: string) => boolean;
  /** Trigger escape toward a wordSprite position (requires an active capture). */
  dispatchEscapeTo: (targetX: number, targetY: number, hitIdx?: number) => void;
};

export type { RoamerCaptureBridge } from '../../../../core/types/bridgeTypes';

export type RoamerSwimZoneProps = {
  words: string[];
  interactive?: boolean;
  sounds?: UnderseaThemeSoundController;
  /** When false, fish taps are ignored even if `interactive` is true. */
  captureEnabled?: boolean;
  /**
   * When false, captured fish swim directly to the wordSprite without a bubble
   * inflate/pop sequence (table exercise keeps the default `true`).
   */
  bubbleCaptureEnabled?: boolean;
  /** Fixed z-index for the swim zone (e.g. above wordSprite during direct escape). */
  swimZoneZIndex?: number;
  /** Override where the capture bubble travels (defaults to roamer zone center). */
  bubbleTarget?: RoamerSwimZoneBubbleTarget;
  controllerRef?: RefObject<RoamerSwimZoneController | null>;
};
